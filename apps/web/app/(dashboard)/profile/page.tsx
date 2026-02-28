"use client";

import { getSupabaseClient } from "@chief/data";
import { Card } from "@chief/ui/web";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useLanguage, type AppLanguage } from "../../../lib/language";

interface ProfileState {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
}

type Provider = "google" | "microsoft";
type ExtendedProvider = Provider | "apple";

interface ToolConnection {
  provider: ExtendedProvider;
  connected: boolean;
  connected_at: string | null;
  accounts: number;
}

interface ToolConnectionAccount {
  id: string;
  provider: ExtendedProvider;
  provider_user_id: string;
  created_at: string;
}

function providerLabel(provider: ExtendedProvider) {
  if (provider === "google") return "Google Workspace";
  if (provider === "microsoft") return "Microsoft 365";
  return "Apple";
}

function providerDescription(provider: ExtendedProvider) {
  if (provider === "google") return "Gmail + Google Calendar";
  if (provider === "microsoft") return "Outlook + Microsoft Calendar";
  return "Apple Mail + Calendar";
}

function formatDate(iso: string | null) {
  if (!iso) return "Not connected";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Not connected";
  return `Connected ${date.toLocaleString()}`;
}

function toErrorMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message.trim().length > 0) return err.message;
  if (typeof err === "object" && err && "message" in err) {
    const candidate = (err as { message?: unknown }).message;
    if (typeof candidate === "string" && candidate.trim().length > 0) return candidate;
  }
  return fallback;
}

function emptyConnections(): ToolConnection[] {
  return [
    { provider: "google", connected: false, connected_at: null, accounts: 0 },
    { provider: "microsoft", connected: false, connected_at: null, accounts: 0 },
    { provider: "apple", connected: false, connected_at: null, accounts: 0 }
  ];
}

export default function ProfilePage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const localBuildMode = !supabase;
  const router = useRouter();
  const { language, setLanguage, spelling } = useLanguage();

  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [toolsLoading, setToolsLoading] = useState(true);
  const [toolsError, setToolsError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [connections, setConnections] = useState<ToolConnection[]>(emptyConnections());
  const [connectionAccounts, setConnectionAccounts] = useState<ToolConnectionAccount[]>([]);

  async function getAccessToken() {
    if (!supabase) throw new Error("Local build mode has no auth token.");
    const { data } = await supabase.auth.getSession();
    if (!data.session?.access_token) {
      throw new Error("Authentication session is not ready. Refresh and try again.");
    }
    return data.session.access_token;
  }

  async function loadConnections() {
    setToolsError(null);
    setToolsLoading(true);

    if (!supabase) {
      setConnections(emptyConnections());
      setConnectionAccounts([]);
      setToolsLoading(false);
      return;
    }

    try {
      const token = await getAccessToken();
      const response = await fetch("/api/inbox", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const payload = (await response.json()) as
        | {
            connections?: ToolConnection[];
            connection_accounts?: ToolConnectionAccount[];
            error?: { message?: string };
          };

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Unable to load tools.");
      }

      const next = payload.connections ?? [];
      setConnections([
        next.find((item) => item.provider === "google") ?? {
          provider: "google",
          connected: false,
          connected_at: null,
          accounts: 0
        },
        next.find((item) => item.provider === "microsoft") ?? {
          provider: "microsoft",
          connected: false,
          connected_at: null,
          accounts: 0
        },
        next.find((item) => item.provider === "apple") ?? {
          provider: "apple",
          connected: false,
          connected_at: null,
          accounts: 0
        }
      ]);
      setConnectionAccounts(payload.connection_accounts ?? []);
    } catch (err) {
      setToolsError(toErrorMessage(err, "Unable to load tools."));
    } finally {
      setToolsLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      if (!supabase) {
        if (active) {
          setProfile({
            id: "local-user",
            email: "local@chief.app",
            name: "Local Build",
            avatar_url: null
          });
          setLoading(false);
        }
        return;
      }

      const { data } = await supabase.auth.getUser();
      if (!active) return;

      const user = data.user;
      setProfile(
        user
          ? {
              id: user.id,
              email: user.email ?? "",
              name:
                (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
                (typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim()) ||
                user.email?.split("@")[0] ||
                "Profile",
              avatar_url:
                (typeof user.user_metadata?.avatar_url === "string" && user.user_metadata.avatar_url.trim()) ||
                (typeof user.user_metadata?.picture === "string" && user.user_metadata.picture.trim()) ||
                null
            }
          : null
      );
      setLoading(false);

      if (!user) {
        router.replace("/");
      }
    }

    void loadProfile();
    void loadConnections();

    return () => {
      active = false;
    };
  }, [router, supabase]);

  async function updateConnection(
    provider: ExtendedProvider,
    action: "connect" | "disconnect",
    options?: { connection_id?: string; provider_user_id?: string }
  ) {
    if (!supabase) {
      setToolsError("Tool connections are paused in local build mode.");
      return;
    }

    setToolsError(null);
    setSavingKey(options?.connection_id ? `${provider}:${options.connection_id}` : `${provider}:${action}`);
    try {
      const token = await getAccessToken();
      const response = await fetch("/api/inbox/connect", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          provider,
          action,
          ...options
        })
      });

      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Unable to update tool connection.");
      }

      await loadConnections();
    } catch (err) {
      setToolsError(toErrorMessage(err, "Unable to update tool connection."));
    } finally {
      setSavingKey(null);
    }
  }

  async function signOut() {
    setSigningOut(true);
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.replace("/");
  }

  if (loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center rounded-[20px] bg-white text-[14px] text-[#656873]">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-[30px] font-semibold tracking-tight">Profile</h1>

      <Card className="space-y-4 border border-black/10 p-6 shadow-none">
        <div className="flex items-center gap-3">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.name}
              className="h-14 w-14 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="grid h-14 w-14 place-items-center rounded-full bg-[#E5E7EB] text-[18px] font-semibold text-[#30333a]">
              {(profile?.name?.slice(0, 1) || "P").toUpperCase()}
            </span>
          )}
          <div>
            <p className="text-[16px] font-semibold text-textPrimary">{profile?.name || "Profile"}</p>
            <p className="text-[13px] text-textSecondary">{profile?.email || "Not available"}</p>
          </div>
        </div>

        <div>
          <p className="text-[13px] font-medium uppercase tracking-[0.08em] text-textSecondary">Account</p>
          <p className="mt-1 break-all text-[12px] text-textSecondary">User ID: {profile?.id || "Not available"}</p>
        </div>

        <div className="rounded-[14px] border border-black/10 p-4">
          <div className="mb-2">
            <p className="text-[13px] font-medium uppercase tracking-[0.08em] text-textSecondary">Language</p>
            <p className="text-[12px] text-textSecondary">
              Choose app language and spelling preferences.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <label htmlFor="app-language" className="text-[13px] font-medium text-textPrimary">
              App language
            </label>
            <select
              id="app-language"
              value={language}
              onChange={(event) => setLanguage(event.target.value as AppLanguage)}
              className="h-10 min-w-[190px] rounded-[10px] border border-black/10 bg-white px-3 text-[13px] text-textPrimary"
            >
              <option value="en-GB">English (UK)</option>
              <option value="en-US">English (US)</option>
            </select>
          </div>
          <p className="mt-2 text-[12px] text-textTertiary">
            Current spelling: {spelling("centralized", "centralised")}
          </p>
        </div>

        <div className="rounded-[14px] border border-black/10 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-[13px] font-medium uppercase tracking-[0.08em] text-textSecondary">Tools</p>
              <p className="text-[12px] text-textSecondary">
                Connect messaging tools and calendars in one place.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadConnections()}
              disabled={localBuildMode || toolsLoading || Boolean(savingKey)}
              className="h-8 rounded-pill bg-chipBg px-3 text-[12px] font-medium text-textSecondary disabled:opacity-70"
            >
              {toolsLoading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {localBuildMode ? (
            <p className="mb-2 text-[12px] text-textSecondary">
              Supabase integrations are paused in local build mode.
            </p>
          ) : null}

          {toolsError ? <p className="mb-2 text-[12px] font-medium text-[#b42318]">{toolsError}</p> : null}

          <div className="space-y-2">
            {connections.map((item) => {
              const providerAccounts = connectionAccounts.filter((account) => account.provider === item.provider);
              const busyAdd = savingKey === `${item.provider}:connect`;
              const busyDisconnectAll = savingKey === `${item.provider}:disconnect`;
              return (
                <div key={item.provider} className="rounded-[12px] border border-black/10 bg-[#FAFAFB] p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[14px] font-semibold text-textPrimary">{providerLabel(item.provider)}</p>
                      <p className="text-[12px] text-textSecondary">{providerDescription(item.provider)}</p>
                      <p className="text-[12px] text-textTertiary">
                        {item.connected
                          ? `${item.accounts} account(s) connected • latest ${formatDate(item.connected_at)}`
                          : "Not connected"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void updateConnection(item.provider, "connect")}
                        disabled={localBuildMode || busyAdd || toolsLoading}
                        className="h-9 rounded-pill bg-chipActiveBg px-3 text-[12px] font-medium text-chipActiveText disabled:opacity-70"
                      >
                        {busyAdd ? "Adding..." : "Add account"}
                      </button>
                      {providerAccounts.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => void updateConnection(item.provider, "disconnect")}
                          disabled={localBuildMode || busyDisconnectAll || toolsLoading}
                          className="h-9 rounded-pill bg-[#FBE9EA] px-3 text-[12px] font-medium text-[#A12A32] disabled:opacity-70"
                        >
                          {busyDisconnectAll ? "Updating..." : "Disconnect all"}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {providerAccounts.length > 0 ? (
                    <div className="mt-3 space-y-2 border-t border-black/10 pt-3">
                      {providerAccounts.map((account) => {
                        const busyDisconnect = savingKey === `${item.provider}:${account.id}`;
                        return (
                          <div
                            key={account.id}
                            className="flex items-center justify-between gap-2 rounded-[10px] border border-black/10 bg-white px-3 py-2"
                          >
                            <div>
                              <p className="text-[12px] font-medium text-textPrimary">{account.provider_user_id}</p>
                              <p className="text-[11px] text-textTertiary">{formatDate(account.created_at)}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                void updateConnection(item.provider, "disconnect", {
                                  connection_id: account.id
                                })
                              }
                              disabled={localBuildMode || busyDisconnect || toolsLoading}
                              className="h-8 rounded-pill bg-[#FBE9EA] px-3 text-[11px] font-medium text-[#A12A32] disabled:opacity-70"
                            >
                              {busyDisconnect ? "..." : "Disconnect"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => void signOut()}
            disabled={signingOut}
            className="h-11 rounded-[12px] bg-[#111418] px-5 text-[14px] font-semibold text-white transition hover:bg-black disabled:opacity-70"
          >
            {signingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </Card>
    </div>
  );
}
