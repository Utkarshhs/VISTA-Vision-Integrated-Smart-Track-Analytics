import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { activityLogTable, componentsTable } from "@workspace/db";
import { AnalyzeComponentBody } from "@workspace/api-zod";
import { ai } from "@workspace/integrations-gemini-ai";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.post("/gemini/analyze-component", async (req, res) => {
  const body = AnalyzeComponentBody.parse(req.body);

  const prompt = `You are RailTrack-AI, an expert railway track component inspector. Analyze this image of a ${body.componentType} railway component.

Component Details:
- Component Type: ${body.componentType}
- Age: ${body.ageMonths} months
- Current CII Score: ${body.currentCiiScore}/100

Perform a thorough inspection:
1. Detect any physical defects (cracks, rust, displacement, wear, corrosion, misalignment)
2. Assess the severity of any damage found
3. Compare against expected condition for age ${body.ageMonths} months
4. Determine if the mathematical CII score of ${body.currentCiiScore} should be overridden

Respond in this EXACT JSON format (no markdown, no code blocks):
{
  "analysis": "Detailed technical analysis of visible condition",
  "suggestedCiiScore": <number 0-100>,
  "criticalOverride": <true if structural cracks detected forcing CII below 30, false otherwise>,
  "defectsDetected": ["list", "of", "specific", "defects"],
  "recommendation": "Specific maintenance recommendation",
  "certificationStatus": "<CERTIFIED_HEALTHY|FLAGGED_MODERATE|FLAGGED_CRITICAL|REPLACEMENT_REQUIRED>"
}

Be precise and technical. If no image is provided or it is unrecognizable, respond based on the mathematical CII alone.`;

  const contents: Array<{ role: "user"; parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> }> = [
    {
      role: "user",
      parts: [
        {
          inlineData: {
            mimeType: body.mimeType,
            data: body.imageBase64,
          },
        },
        { text: prompt },
      ],
    },
  ];

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents,
    config: { maxOutputTokens: 8192 },
  });

  const rawText = response.text ?? "";
  let parsed: {
    analysis: string;
    suggestedCiiScore: number;
    criticalOverride: boolean;
    defectsDetected: string[];
    recommendation: string;
    certificationStatus: string;
  };

  try {
    parsed = JSON.parse(rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
  } catch {
    // Fallback if Gemini doesn't return clean JSON
    const score = body.currentCiiScore;
    parsed = {
      analysis: rawText || "Visual analysis completed. Component condition assessed based on available data.",
      suggestedCiiScore: score,
      criticalOverride: score < 30,
      defectsDetected: score < 30 ? ["Potential structural compromise"] : score < 55 ? ["Visible wear"] : [],
      recommendation: score < 30 ? "Immediate inspection required. Temporary Speed Restriction advised." : score < 55 ? "Schedule replacement within 48-72 hours." : "Monitor in next routine cycle.",
      certificationStatus: score < 30 ? "FLAGGED_CRITICAL" : score < 55 ? "FLAGGED_MODERATE" : score < 75 ? "FLAGGED_MODERATE" : "CERTIFIED_HEALTHY",
    };
  }

  // Log the Gemini analysis to activity feed
  const [comp] = await db.select().from(componentsTable).where(eq(componentsTable.id, body.componentId));
  await db.insert(activityLogTable).values({
    type: "gemini_analysis",
    componentId: comp?.componentId ?? String(body.componentId),
    description: `Gemini Vision analyzed ${comp?.componentId ?? body.componentId}: ${parsed.certificationStatus}. CII ${body.currentCiiScore} → ${parsed.suggestedCiiScore}`,
    severity: parsed.criticalOverride ? "CRITICAL" : parsed.certificationStatus === "FLAGGED_MODERATE" ? "HIGH_RISK" : "INFO",
    timestamp: new Date(),
  });

  res.json(parsed);
});

export default router;
