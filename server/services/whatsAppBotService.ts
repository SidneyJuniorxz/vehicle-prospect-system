import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;
import qrcode from "qrcode";
import { getDb, updateLead, logActivity, getWhatsappTemplates } from "../db";
import { eq } from "drizzle-orm";
import { leads, vehicleAds } from "../../drizzle/schema";

export type BotStatus = "disconnected" | "connecting" | "qr_ready" | "ready" | "failed";

export class WhatsAppBotService {
    private client: InstanceType<typeof Client>;
    private status: BotStatus = "disconnected";
    private qrCode: string | null = null;
    private lastError: string | null = null;

    constructor() {
        this.client = new Client({
            authStrategy: new LocalAuth({
                dataPath: "./.wwebjs_auth"
            }),
            puppeteer: {
                args: ["--no-sandbox", "--disable-setuid-sandbox"],
                headless: true
            }
        });

        this.setupEventListeners();
    }

    private setupEventListeners() {
        this.client.on("qr", async (qr: string) => {
            console.log("[WhatsAppBot] QR Code received");
            this.status = "qr_ready";
            try {
                this.qrCode = await qrcode.toDataURL(qr);
            } catch (err) {
                console.error("[WhatsAppBot] Error generating QR data URL", err);
            }
        });

        this.client.on("ready", () => {
            console.log("[WhatsAppBot] Client is ready!");
            this.status = "ready";
            this.qrCode = null;
        });

        this.client.on("authenticated", () => {
            console.log("[WhatsAppBot] Authenticated");
        });

        this.client.on("auth_failure", (msg: string) => {
            console.error("[WhatsAppBot] Auth failure", msg);
            this.status = "failed";
            this.lastError = msg;
        });

        this.client.on("disconnected", (reason: string) => {
            console.log("[WhatsAppBot] Disconnected:", reason);
            this.status = "disconnected";
            this.qrCode = null;
        });

        this.client.on("message", async (msg: any) => {
            // Logic to detect if a seller is replying to our lead message
            await this.handleIncomingMessage(msg);
        });
    }

    public async initialize() {
        if (this.status === "ready" || this.status === "connecting") return;

        console.log("[WhatsAppBot] Initializing...");
        this.status = "connecting";
        try {
            await this.client.initialize();
        } catch (err: any) {
            console.error("[WhatsAppBot] Initialization error", err);
            this.status = "failed";
            this.lastError = err.message;
        }
    }

    public async logout() {
        try {
            await this.client.logout();
            this.status = "disconnected";
        } catch (err) {
            console.error("[WhatsAppBot] Logout error", err);
        }
    }

    public getStatus() {
        return {
            status: this.status,
            qrCode: this.qrCode,
            lastError: this.lastError
        };
    }

    public async sendMessage(to: string, message: string) {
        if (this.status !== "ready") {
            throw new Error("WhatsApp Bot is not ready");
        }

        // Format number for WhatsApp (remove any non-digits, add @c.us)
        const cleanNumber = to.replace(/\D/g, "");
        const finalId = cleanNumber.includes("@c.us") ? cleanNumber : `${cleanNumber}@c.us`;

        return await this.client.sendMessage(finalId, message);
    }

    private async handleIncomingMessage(msg: any) {
        // Only process private chats
        if (msg.from.includes("@g.us")) return;

        const senderNumber = msg.from.split("@")[0];

        // Search for a lead with this contact info
        const db = await getDb();
        if (!db) return;

        // We search for leads where the ad's contact_info (once we have it) or we might need to store the phone used to message
        // Simplification for now: search in vehicle_ads contact_info or leads notes
        // Actually, a better way is to track "sent messages" in a table, but for now let's use the phone number match.

        const results = await db.select({
            leadId: leads.id,
            status: leads.status
        })
            .from(leads)
            .innerJoin(vehicleAds, eq(leads.adId, vehicleAds.id))
            .where(eq(vehicleAds.contactInfo, senderNumber))
            .limit(1);

        if (results.length > 0) {
            const lead = results[0];
            if (lead.status === "new" || (lead.status as string) === "sent") {
                console.log(`[WhatsAppBot] Detection active reply from ${senderNumber} for lead ${lead.leadId}. Updating status to 'in_progress'`);
                await updateLead(lead.leadId, { status: "in_progress" });
                await logActivity({
                    userId: 1, // System or specific bot user
                    action: "whatsapp_reply_received",
                    entityType: "lead",
                    entityId: lead.leadId,
                    details: `Mensagem recebida: ${msg.body.substring(0, 100)}...`
                });
            }
        }
    }
}

let _botService: WhatsAppBotService | null = null;

export function getWhatsAppBotService() {
    if (!_botService) {
        _botService = new WhatsAppBotService();
    }
    return _botService;
}
