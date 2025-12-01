import authRoutes from "./auth.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
import listingRoutes from "./listing.routes.js";
import leadRoutes from "./lead.routes.js";
import ownerRoutes from "./owner.routes.js";
import tenantRoutes from "./tenant.routes.js";
import contractRoutes from "./contract.routes.js";

export default (app) => {
    app.use("/auth", authRoutes);
    app.use("/dashboard", dashboardRoutes);
    app.use("/listings", listingRoutes);
    app.use("/leads", leadRoutes);
    app.use("/owners", ownerRoutes);
    app.use("/tenants", tenantRoutes);
    app.use("/contracts", contractRoutes);
};
