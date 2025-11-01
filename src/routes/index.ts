import { Express } from "express";

import listingRoutes from "./listing.routes.js";
import leadRoutes from "./lead.routes.js";
import partnerRoutes from "./partner.routes.js";


export default (app: Express) => {
app.use("/listings", listingRoutes);
app.use("/leads", leadRoutes);
app.use("/partners", partnerRoutes);
};
