import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../../api/axiosInstance";
import StepUpModal from "../../components/common/StepUpModal";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";

const initialSecurity = { maxLoginAttempts: 5, lockoutMinutes: 15, stepUpWindowMinutes: 10 };
const initialAudit = { retentionDays: 365, integrityChainEnabled: true };

export default function SuperAdminSettings() {
    const [security, setSecurity] = useState(initialSecurity);
    const [audit, setAudit] = useState(initialAudit);
    const [integrityResult, setIntegrityResult] = useState(null);
    const [stepUpOpen, setStepUpOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);

    const load = async () => {
        try {
            const res = await api.get("/superadmin/site-config");
            if (res.data?.security) setSecurity({ ...initialSecurity, ...res.data.security });
            if (res.data?.audit) setAudit({ ...initialAudit, ...res.data.audit });
        } catch (error) {
            toast.error(error?.response?.data?.message || "Unable to load settings");
        }
    };

    useEffect(() => { load(); }, []);

    const saveSecurity = async (e) => {
        e.preventDefault();
        try {
            await api.put("/superadmin/settings/security", {
                maxLoginAttempts: Number(security.maxLoginAttempts),
                lockoutMinutes: Number(security.lockoutMinutes),
                stepUpWindowMinutes: Number(security.stepUpWindowMinutes),
            });
            toast.success("Security settings updated");
        } catch (error) {
            toast.error(error?.response?.data?.message || "Unable to update security settings");
        }
    };

    const saveAudit = async (e) => {
        e.preventDefault();
        try {
            await api.put("/superadmin/settings/audit", {
                retentionDays: Number(audit.retentionDays),
                integrityChainEnabled: Boolean(audit.integrityChainEnabled),
            });
            toast.success("Audit settings updated");
        } catch (error) {
            toast.error(error?.response?.data?.message || "Unable to update audit settings");
        }
    };

    const verifyIntegrity = async () => {
        try {
            const res = await api.get("/superadmin/audit/verify-integrity");
            setIntegrityResult(res.data);
            toast.success(res.data?.valid ? "Audit integrity verified" : "Audit integrity issues found");
        } catch (error) {
            toast.error(error?.response?.data?.message || "Unable to verify audit integrity");
        }
    };

    const cleanupAudit = async () => {
        const run = async () => {
            const res = await api.post("/superadmin/audit/cleanup");
            toast.success(`Cleanup complete. Deleted ${res.data?.deletedCount || 0} logs.`);
        };
        try {
            await run();
        } catch (error) {
            if (error?.response?.status === 403 && String(error?.response?.data?.message || "").toLowerCase().includes("step-up")) {
                setPendingAction(() => run);
                setStepUpOpen(true);
                return;
            }
            toast.error(error?.response?.data?.message || "Unable to run audit cleanup");
        }
    };

    return (
        <section className="space-y-6">
            <div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Security & Audit Settings</h1>
                    <p className="text-sm text-gray-600">Configure lockouts, step-up windows, retention policy, and audit integrity operations.</p>
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <form className="ui-card space-y-3" onSubmit={saveSecurity}>
                    <h2 className="text-lg font-semibold tracking-tight text-gray-900">Login Security</h2>
                    <label className="grid gap-2 text-sm font-medium text-gray-700">Max failed attempts
                        <input className="ui-input" type="number" min="1" max="20" value={security.maxLoginAttempts}
                            onChange={(e) => setSecurity((s) => ({ ...s, maxLoginAttempts: e.target.value }))} />
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-gray-700">Lockout minutes
                        <input className="ui-input" type="number" min="1" max="180" value={security.lockoutMinutes}
                            onChange={(e) => setSecurity((s) => ({ ...s, lockoutMinutes: e.target.value }))} />
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-gray-700">Step-up validity (minutes)
                        <input className="ui-input" type="number" min="1" max="120" value={security.stepUpWindowMinutes}
                            onChange={(e) => setSecurity((s) => ({ ...s, stepUpWindowMinutes: e.target.value }))} />
                    </label>
                    <Button>Save Security Settings</Button>
                </form>

                <form className="ui-card space-y-3" onSubmit={saveAudit}>
                    <h2 className="text-lg font-semibold tracking-tight text-gray-900">Audit Policy</h2>
                    <label className="grid gap-2 text-sm font-medium text-gray-700">Retention days
                        <input className="ui-input" type="number" min="30" max="3650" value={audit.retentionDays}
                            onChange={(e) => setAudit((a) => ({ ...a, retentionDays: e.target.value }))} />
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                            type="checkbox"
                            checked={audit.integrityChainEnabled}
                            onChange={(e) => setAudit((a) => ({ ...a, integrityChainEnabled: e.target.checked }))}
                        /> Enable integrity chain
                    </label>
                    <div className="flex gap-3">
                        <Button type="button" variant="outline" onClick={verifyIntegrity}>Verify Integrity</Button>
                        <Button type="button" variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={cleanupAudit}>Run Retention Cleanup</Button>
                    </div>
                    <Button>Save Audit Settings</Button>
                    {integrityResult && (
                        <p className="text-sm text-gray-600">
                            Integrity status: {integrityResult.valid ? "Valid" : "Broken"} | Checked logs: {integrityResult.total}
                        </p>
                    )}
                </form>
            </div>

            <StepUpModal
                open={stepUpOpen}
                onClose={() => { setStepUpOpen(false); setPendingAction(null); }}
                onVerified={async () => {
                    if (!pendingAction) return;
                    await pendingAction();
                    setPendingAction(null);
                }}
            />
        </section>
    );
}

