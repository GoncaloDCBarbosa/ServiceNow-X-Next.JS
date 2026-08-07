"use client";

import { useEffect, useState } from "react";
import { SiteHeader } from "./components/SiteHeader";
import { HubTile, type FetchState } from "./components/HubTile";
import { normalizeRecords } from "@/lib/sn-format";

export default function Home() {
  const [challengeState, setChallengeState] = useState<FetchState>("loading");
  const [challengePreview, setChallengePreview] = useState<string[]>([]);
  const [challengeError, setChallengeError] = useState<string>();

  const [instanceState, setInstanceState] = useState<FetchState>("loading");
  const [instancePreview, setInstancePreview] = useState<string[]>([]);
  const [instanceError, setInstanceError] = useState<string>();

  const [playerState, setPlayerState] = useState<FetchState>("loading");
  const [playerPreview, setPlayerPreview] = useState<string[]>([]);
  const [playerError, setPlayerError] = useState<string>();

  useEffect(() => {
    fetch("/api/challenges?limit=4")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        const rows = normalizeRecords(data.result ?? []);
        setChallengePreview(
          rows.map((r) => r.name || r.short_description || r.number || "Untitled challenge")
        );
        setChallengeState("ready");
      })
      .catch((err) => {
        setChallengeError(err instanceof Error ? err.message : "Request failed.");
        setChallengeState("error");
      });

    fetch("/api/challenge-instances?limit=4")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        const rows = normalizeRecords(data.result ?? []);
        // This table has no name/short_description/number field — the
        // instance's Challenge reference is its natural label instead.
        setInstancePreview(
          rows.map((r) => r.name || r.short_description || r.number || r.challenge || "Untitled instance")
        );
        setInstanceState("ready");
      })
      .catch((err) => {
        setInstanceError(err instanceof Error ? err.message : "Request failed.");
        setInstanceState("error");
      });

    fetch("/api/players?limit=4")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        const rows = normalizeRecords(data.result ?? []);
        // This table has no name field either — the field that actually
        // holds the participant is "user" (a reference to sys_user), not
        // "player".
        setPlayerPreview(
          rows.map((r) => r.name || r.user_name || r.user || r.number || "Unnamed player")
        );
        setPlayerState("ready");
      })
      .catch((err) => {
        setPlayerError(err instanceof Error ? err.message : "Request failed.");
        setPlayerState("error");
      });
  }, []);

  return (
    <>
      <SiteHeader />

      <main className="container" style={{ paddingBottom: 80 }}>
        <section style={{ marginTop: 8, marginBottom: 44 }}>
          <p className="eyebrow" style={{ marginBottom: 12 }}>
            TRH Plus · ServiceNow Gamification
          </p>
          <h1
            style={{
              fontSize: 38,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              maxWidth: 640,
              marginBottom: 14,
              lineHeight: 1.15,
            }}
          >
            Command center for challenges and players.
          </h1>
          <p style={{ color: "var(--muted)", maxWidth: 560, fontSize: 16, lineHeight: 1.6 }}>
            Live views into the tables behind TRH Plus — the challenges people complete, the
            runs they&apos;re on, and the players earning points for them.
          </p>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 20,
          }}
        >
          <HubTile
            href="/challenges"
            accent="amber"
            icon="◆"
            title="Challenges"
            description="Every challenge configured in TRH Plus — active status, rewards, and timing."
            table="x_trhrt_trh_plus_challenge"
            status={challengeState}
            preview={challengePreview}
            errorMessage={challengeError}
          />
          <HubTile
            href="/challenge-instances"
            accent="amber"
            icon="◆"
            title="Challenge Instances"
            description="Every in-progress or completed run of a challenge, tied to the player taking it on."
            table="x_trhrt_trh_plus_challenge_instance"
            status={instanceState}
            preview={instancePreview}
            errorMessage={instanceError}
          />
          <HubTile
            href="/players"
            accent="violet"
            icon="◉"
            title="Players"
            description="The gamification profile behind each participant."
            table="x_trhrt_trh_plus_player"
            status={playerState}
            preview={playerPreview}
            errorMessage={playerError}
          />
        </section>
      </main>
    </>
  );
}
