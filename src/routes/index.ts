import { Express } from "express";

import listingRoutes from "./listing.routes";
import leadRoutes from "./lead.routes";
import partnerRoutes from "./partner.routes";


export default (app: Express) => {
app.use("/listings", listingRoutes);
app.use("/leads", leadRoutes);
app.use("/partners", partnerRoutes);
};
