import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import walletRouter from "./wallet";
import servicesRouter from "./services";
import transactionsRouter from "./transactions";
import notificationsRouter from "./notifications";
import referralsRouter from "./referrals";
import supportRouter from "./support";
import adminRouter from "./admin";
import airtimeToCashRouter from "./airtime-to-cash";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(walletRouter);
router.use(servicesRouter);
router.use(transactionsRouter);
router.use(notificationsRouter);
router.use(referralsRouter);
router.use(supportRouter);
router.use(adminRouter);
router.use(airtimeToCashRouter);

export default router;
