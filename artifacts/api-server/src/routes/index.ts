import { Router, type IRouter } from "express";
import healthRouter from "./health";
import sectorsRouter from "./sectors";
import hubsRouter from "./hubs";
import engineersRouter from "./engineers";
import componentsRouter from "./components";
import alertsRouter from "./alerts";
import inspectionsRouter from "./inspections";
import dashboardRouter from "./dashboard";
import geminiRouter from "./gemini";

const router: IRouter = Router();

router.use(healthRouter);
router.use(sectorsRouter);
router.use(hubsRouter);
router.use(engineersRouter);
router.use(componentsRouter);
router.use(alertsRouter);
router.use(inspectionsRouter);
router.use(dashboardRouter);
router.use(geminiRouter);

export default router;
