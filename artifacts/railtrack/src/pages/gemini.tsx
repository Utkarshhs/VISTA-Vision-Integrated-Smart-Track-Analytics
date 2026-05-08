import { useState, useRef, useEffect } from "react";
import { useAnalyzeComponent, useCreateInspection, useListComponents } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Upload, Camera, Cpu, Activity, AlertTriangle, Eye, CheckCircle2, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function GeminiInspector() {
  const [isOffline, setIsOffline] = useState(false);
  const [selectedComponentId, setSelectedComponentId] = useState<string>("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string>("");
  const [mimeType, setMimeType] = useState<string>("");
  
  const [processingStep, setProcessingStep] = useState<number>(0); // 0: none, 1-3: steps, 4: done
  const [showOverride, setShowOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: components } = useListComponents();
  const analyzeMutation = useAnalyzeComponent();
  const createInspection = useCreateInspection();

  const selectedComponent = components?.find(c => c.id.toString() === selectedComponentId);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMimeType(file.type);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setImagePreview(result);
      // Remove data URL prefix to get pure base64 for API
      const base64 = result.split(',')[1];
      setImageBase64(base64);
      
      // Reset state for new image
      setProcessingStep(0);
      analyzeMutation.reset();
      setShowOverride(false);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!selectedComponent || !imageBase64) return;

    // Simulation sequence
    setProcessingStep(1);
    await new Promise(r => setTimeout(r, 800));
    setProcessingStep(2);
    await new Promise(r => setTimeout(r, 800));
    setProcessingStep(3);
    
    // Actual API Call
    analyzeMutation.mutate({
      data: {
        componentId: selectedComponent.id,
        imageBase64,
        mimeType,
        currentCiiScore: selectedComponent.ciiScore,
        componentType: selectedComponent.type,
        ageMonths: selectedComponent.ageMonths
      }
    }, {
      onSuccess: () => {
        setProcessingStep(4);
      },
      onError: () => {
        setProcessingStep(0);
        toast({ title: "Analysis Failed", variant: "destructive" });
      }
    });
  };

  const handleLogInspection = (humanOverride = false) => {
    if (!selectedComponent || !analyzeMutation.data) return;

    createInspection.mutate({
      data: {
        componentId: selectedComponent.id,
        engineerId: 1, // Assuming a fixed engineer ID for simulation
        outcome: analyzeMutation.data.certificationStatus,
        geminiAnalysis: analyzeMutation.data.analysis,
        geminiCiiOverride: analyzeMutation.data.suggestedCiiScore,
        humanOverride,
        humanOverrideReason: humanOverride ? overrideReason : null,
        inspectedAt: new Date().toISOString()
      }
    }, {
      onSuccess: () => {
        toast({ title: "Inspection Logged Successfully" });
        // Reset
        setImagePreview(null);
        setImageBase64("");
        setProcessingStep(0);
        analyzeMutation.reset();
        setShowOverride(false);
      }
    });
  };

  const steps = [
    "Extracting spectral features...",
    "Running TensorFlow inference...",
    "Reasoning with Gemini Vision..."
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
            Gemini Vision Inspector
          </h2>
          <p className="text-muted-foreground">AI-assisted structural analysis for Field Engineers</p>
        </div>

        <div className="flex items-center space-x-2 bg-black/40 p-2 rounded-lg border border-white/10">
          <Switch 
            id="offline-mode" 
            checked={isOffline}
            onCheckedChange={setIsOffline}
          />
          <Label htmlFor="offline-mode" className={cn("font-display", isOffline ? "text-high-risk" : "text-muted-foreground")}>
            {isOffline ? "OFFLINE MODE" : "ONLINE"}
          </Label>
        </div>
      </div>

      {isOffline && (
        <div className="bg-high-risk/20 border border-high-risk text-high-risk p-4 rounded-lg flex items-center gap-3">
          <AlertTriangle className="w-5 h-5" />
          <div>
            <p className="font-bold font-display">System Offline</p>
            <p className="text-sm opacity-80">Gemini Vision AI is unavailable. Proceed with manual human inspection protocol.</p>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left Col: Setup */}
        <div className="space-y-6">
          <Card className="glass-panel border-white/10">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Cpu className="w-5 h-5 text-primary" /> Target Component
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedComponentId} onValueChange={setSelectedComponentId}>
                <SelectTrigger className="w-full bg-black/40 border-white/10 font-display">
                  <SelectValue placeholder="Scan or select component ID" />
                </SelectTrigger>
                <SelectContent className="bg-card border-white/10 text-white max-h-[300px]">
                  {components?.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()} className="font-display">
                      {c.componentId} <span className="text-muted-foreground text-xs ml-2 font-sans">{c.type}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedComponent && (
                <div className="mt-4 p-3 bg-black/30 rounded border border-white/5 text-sm space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">Type:</span> <span>{selectedComponent.type}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Location:</span> <span>{selectedComponent.location}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Current CII:</span> <span className="font-display font-bold text-primary">{selectedComponent.ciiScore.toFixed(1)}</span></div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-panel border-white/10">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary" /> Visual Capture
              </CardTitle>
            </CardHeader>
            <CardContent>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleImageUpload}
              />
              
              {!imagePreview ? (
                <div 
                  className="border-2 border-dashed border-white/20 rounded-xl h-48 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">Upload component photo</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 10MB</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-xl overflow-hidden border border-white/10 group">
                    <img src={imagePreview} alt="Component preview" className="w-full h-auto object-cover max-h-64" />
                    
                    {/* Scanline Animation overlay during processing */}
                    {processingStep > 0 && processingStep < 4 && (
                      <motion.div 
                        className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/30 to-transparent h-10 w-full"
                        animate={{ top: ['-10%', '110%'] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                      />
                    )}
                    
                    {processingStep === 0 && (
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>Retake Photo</Button>
                      </div>
                    )}
                  </div>

                  <Button 
                    className="w-full font-bold font-display tracking-wide" 
                    size="lg"
                    disabled={!selectedComponent || isOffline || processingStep > 0}
                    onClick={handleAnalyze}
                  >
                    {isOffline ? "UNAVAILABLE OFFLINE" : processingStep === 0 ? "INITIATE GEMINI SCAN" : "ANALYZING..."}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Results */}
        <div className="space-y-6">
          <Card className={cn(
            "glass-panel min-h-[400px] transition-all duration-500 border-white/10",
            processingStep === 4 ? "shadow-[0_0_30px_rgba(0,255,255,0.1)] border-primary/30" : ""
          )}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" /> Analysis Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              
              {/* Processing Animation */}
              {processingStep > 0 && processingStep < 4 && (
                <div className="space-y-6 pt-8">
                  {steps.map((step, index) => (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: processingStep > index ? 1 : 0.2, x: 0 }}
                      className="flex items-center gap-4"
                    >
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs",
                        processingStep > index + 1 ? "bg-primary text-black" : processingStep === index + 1 ? "bg-primary/20 border border-primary text-primary animate-pulse" : "bg-white/10 text-muted-foreground"
                      )}>
                        {processingStep > index + 1 ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
                      </div>
                      <span className="font-mono text-sm">{step}</span>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Waiting State */}
              {processingStep === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 py-20">
                  <Eye className="w-16 h-16 mb-4" />
                  <p>Awaiting visual input for analysis</p>
                </div>
              )}

              {/* Results State */}
              {processingStep === 4 && analyzeMutation.data && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className={cn(
                    "p-4 rounded-lg border flex items-center justify-between",
                    analyzeMutation.data.certificationStatus === 'REPLACEMENT_REQUIRED' ? "bg-critical/10 border-critical/50" :
                    analyzeMutation.data.certificationStatus === 'FLAGGED_CRITICAL' ? "bg-high-risk/10 border-high-risk/50" :
                    analyzeMutation.data.certificationStatus === 'FLAGGED_MODERATE' ? "bg-moderate/10 border-moderate/50" :
                    "bg-nominal/10 border-nominal/50"
                  )}>
                    <div>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Certification</div>
                      <div className={cn(
                        "font-display font-bold text-xl",
                        analyzeMutation.data.certificationStatus === 'REPLACEMENT_REQUIRED' ? "text-critical" :
                        analyzeMutation.data.certificationStatus === 'FLAGGED_CRITICAL' ? "text-high-risk" :
                        analyzeMutation.data.certificationStatus === 'FLAGGED_MODERATE' ? "text-moderate" :
                        "text-nominal"
                      )}>
                        {analyzeMutation.data.certificationStatus.replace(/_/g, ' ')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Suggested CII</div>
                      <div className="font-display font-bold text-3xl text-white">
                        {analyzeMutation.data.suggestedCiiScore.toFixed(1)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-white">Gemini Assessment</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed bg-black/40 p-3 rounded border border-white/5">
                      {analyzeMutation.data.analysis}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-white">Defects Detected</h4>
                    <div className="flex flex-wrap gap-2">
                      {analyzeMutation.data.defectsDetected.map((d, i) => (
                        <Badge key={i} variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">{d}</Badge>
                      ))}
                      {analyzeMutation.data.defectsDetected.length === 0 && (
                        <span className="text-sm text-muted-foreground">None detected</span>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10 flex gap-3">
                    <Button 
                      className="flex-1 bg-nominal hover:bg-nominal/80 text-black font-bold"
                      onClick={() => handleLogInspection(false)}
                      disabled={createInspection.isPending}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Confirm & Log
                    </Button>
                    <Button 
                      variant="outline" 
                      className="border-white/20 hover:bg-white/10"
                      onClick={() => setShowOverride(!showOverride)}
                    >
                      Truth Check
                    </Button>
                  </div>

                  <AnimatePresence>
                    {showOverride && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-black/50 p-4 rounded-lg border border-primary/30 mt-4 space-y-4"
                      >
                        <Label className="text-primary font-display">Human Override Protocol</Label>
                        <Textarea 
                          placeholder="State reason for overruling AI assessment..."
                          className="bg-black border-white/20 resize-none"
                          value={overrideReason}
                          onChange={(e) => setOverrideReason(e.target.value)}
                        />
                        <Button 
                          variant="destructive" 
                          className="w-full"
                          disabled={!overrideReason || createInspection.isPending}
                          onClick={() => handleLogInspection(true)}
                        >
                          <AlertTriangle className="w-4 h-4 mr-2" /> Override & Log Manual Status
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </motion.div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
