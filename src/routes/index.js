import authRoutes from "./auth.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
import listingRoutes from "./listing.routes.js";
import leadRoutes from "./lead.routes.js";
import partnerRoutes from "./partner.routes.js";
import tenantRoutes from "./tenant.routes.js";

export default (app) => {
    app.use("/auth", authRoutes);
    app.use("/dashboard", dashboardRoutes);
    app.use("/listings", listingRoutes);
    app.use("/leads", leadRoutes);
    app.use("/partners", partnerRoutes);
    app.use("/tenants", tenantRoutes);
};
