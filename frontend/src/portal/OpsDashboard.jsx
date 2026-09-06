import { useCallback, useEffect, useMemo, useState } from "react";
import { portalFetch } from "./portalFetch.js";
import "./ops.css";

/**
 * The collector operations board: every episode in the capture bucket, who wore
 * the camera, and what has been approved, paid or deleted.
 *
 * WEARERS ARE NOT LOGINS. A wearer is a person who carried a camera; almost
 * none of them will ever sign in. The assignment is stored ON THE EPISODE, not
 * as a device→person date range, so a camera handed over mid-shift splits
 * cleanly and settled history never moves when a camera is reassigned.
 */

const fmt = (n) => (n ?? 0).toLocaleString();
const gb = (b) => `${((b ?? 0) / 1e9).toFixed(1)} GB`;

export default function OpsDashboard() {
  const [state, setState] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [session, setSession] = useState("");
  const [wearerName, setWearerName] = useState("");
  const [taskName, setTaskName] = useState("");
  const [taskCat, setTaskCat] = useState("other");
  const [preview, setPreview] = useState(null);   // {recording, files, error, pick}

  const load = useCallback(async () => {
    const r = await portalFetch("/api/ops/state");
    if (!r.ok) return setErr(`Could not load the ledger (HTTP ${r.status}).`);
    setErr("");
    setState(r.data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Every mutation returns the whole new state, so the table can never drift
  // from the server: there is no local patching to get wrong.
  const act = async (key, path, body) => {
    setBusy(key);
    const r = await portalFetch(path, { method: "POST", body: JSON.stringify(body ?? {}) });
    setBusy("");
    if (!r.ok) {
      setErr(r.data?.detail || `That did not work (HTTP ${r.status}).`);
      return;
    }
    setErr("");
    setState(r.data);
  };

  const openPreview = async (recording) => {
    setPreview({ recording, files: [], error: "", pick: 0, loading: true });
    const r = await portalFetch(`/api/ops/episodes/${recording}/files`);
    if (!r.ok) {
      return setPreview({ recording, files: [], pick: 0, loading: false,
                          error: `Could not list this episode (HTTP ${r.status}).` });
    }
    setPreview({ recording, files: r.data.files ?? [], pick: 0, loading: false,
                 error: r.data.ok ? "" : r.data.error });
  };

  const sessions = useMemo(
    () => [...new Set((state?.episodes ?? []).map((e) => e.session))].filter(Boolean).sort(),
    [state],
  );

  // Grouped so the dropdown reads as the taxonomy it is, not a flat list of 13.
  const taskGroups = useMemo(() => {
    const by = new Map();
    for (const task of state?.tasks ?? []) {
      if (!by.has(task.category)) by.set(task.category, []);
      by.get(task.category).push(task);
    }
    return [...by.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [state]);

  const rows = useMemo(() => {
    let list = state?.episodes ?? [];
    if (!showDeleted) list = list.filter((e) => !e.deleted_at);
    if (session) list = list.filter((e) => e.session === session);
    return list;
  }, [state, showDeleted, session]);

  if (!state) {
    return (
      <div className="ops">
        <p className="ops-muted">{err || "Loading the ledger…"}</p>
      </div>
    );
  }

  const t = state.totals;
  const wearerName_ = (id) => state.wearers.find((w) => w.id === id)?.name ?? "";

  return (
    <div className="ops">
      <header className="ops-head">
        <h1>Collector operations</h1>
        <p className="ops-muted">
          Every episode in <code>s3://6thsense-raw</code>, who wore the camera, and what is settled.
        </p>
      </header>

      {err && <p className="ops-error" role="alert">{err}</p>}

      <div className="ops-tiles">
        {[
          ["Episodes", fmt(t.episodes)],
          ["Minutes", fmt(t.minutes)],
          ["Stored", gb(t.bytes)],
          ["Approved", fmt(t.approved)],
          ["Paid", fmt(t.paid)],
          ["Unassigned", fmt(t.unassigned)],
          ["Unlabelled", fmt(t.unlabelled)],
          ["Clock unverified", fmt(t.clock_flagged)],
          ["Deleted", fmt(t.deleted)],
        ].map(([label, value]) => (
          <div className="ops-tile" key={label}>
            <div className="ops-tile-n">{value}</div>
            <div className="ops-tile-l">{label}</div>
          </div>
        ))}
      </div>

      <div className="ops-bar">
        <select value={session} onChange={(e) => setSession(e.target.value)}>
          <option value="">every session</option>
          {sessions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <label className="ops-check">
          <input type="checkbox" checked={showDeleted}
                 onChange={(e) => setShowDeleted(e.target.checked)} />
          show deleted
        </label>
        <span className="ops-spacer" />
        <input placeholder="new wearer's name" value={wearerName}
               onChange={(e) => setWearerName(e.target.value)} />
        <button
          disabled={!wearerName.trim() || busy === "wearer"}
          onClick={async () => {
            await act("wearer", "/api/ops/wearers", { name: wearerName.trim() });
            setWearerName("");
          }}>
          Add wearer
        </button>
        <input placeholder="new task label" value={taskName}
               onChange={(e) => setTaskName(e.target.value)} />
        <select value={taskCat} onChange={(e) => setTaskCat(e.target.value)}
                title="category, as used in the delivered takes catalog">
          {[...new Set([...(state?.tasks ?? []).map((x) => x.category), "other"])]
            .sort().map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button
          disabled={!taskName.trim() || busy === "task"}
          onClick={async () => {
            await act("task", "/api/ops/tasks",
                      { name: taskName.trim(), category: taskCat });
            setTaskName("");
          }}>
          Add task
        </button>
      </div>

      <table className="ops-table">
        <thead>
          <tr>
            <th /><th>Recording</th><th>Camera</th><th>Started</th>
            <th className="num">Min</th><th className="num">Size</th>
            <th>Wearer</th><th>Task</th><th>Quality</th><th>Approved</th><th>Paid</th><th>Delete</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => (
            <tr key={e.recording} className={e.deleted_at ? "ops-row-deleted" : ""}>
              <td>
                <button className="ops-play" title="Preview the video"
                        onClick={() => openPreview(e.recording)}>▶</button>
              </td>
              <td className="mono">
                {e.recording}
                <div className="ops-chip">{e.session}</div>
              </td>
              <td className="mono">{e.device_id}</td>
              <td className="mono">
                {(e.started_at || "").replace("T", " ").slice(0, 16)}
                {!e.clock_ok && (
                  <span className="ops-chip warn"
                        title={`clock source '${e.clock_source}' — the start time may be hours out, so this episode can sit in the wrong week or the wrong person's range`}>
                    clock?
                  </span>
                )}
              </td>
              <td className="num">{e.minutes}</td>
              <td className="num">{e.size_mb} MB</td>
              <td>
                <select
                  value={e.wearer_id ?? ""}
                  disabled={!!e.deleted_at}
                  onChange={(ev) =>
                    act(`assign-${e.recording}`, `/api/ops/episodes/${e.recording}/assign`,
                        { wearer_id: ev.target.value ? Number(ev.target.value) : null })}
                >
                  <option value="">unassigned</option>
                  {state.wearers.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </td>
              <td>
                <select
                  value={e.task_id ?? ""}
                  disabled={!!e.deleted_at}
                  onChange={(ev) =>
                    act(`task-${e.recording}`, `/api/ops/episodes/${e.recording}/task`,
                        { task_id: ev.target.value ? Number(ev.target.value) : null })}
                >
                  <option value="">unlabelled</option>
                  {taskGroups.map(([cat, list]) => (
                    <optgroup key={cat} label={cat.replace(/_/g, " ")}>
                      {list.map((task) => (
                        <option key={task.id} value={task.id}>{task.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </td>
              <td>
                {e.no_metadata ? <span className="ops-chip bad">no metadata</span>
                  : e.truncated ? <span className="ops-chip bad">truncated</span>
                  : e.dropped > 0 ? <span className="ops-chip warn">{e.dropped} dropped</span>
                  : e.complete ? <span className="ops-chip ok">complete</span>
                  : <span className="ops-chip warn">incomplete</span>}
              </td>
              <td className="num">
                <input type="checkbox" checked={e.approved} disabled={!!e.deleted_at}
                       onChange={(ev) =>
                         act(`ap-${e.recording}`, `/api/ops/episodes/${e.recording}/approve`,
                             { value: ev.target.checked })} />
              </td>
              <td className="num">
                <input type="checkbox" checked={e.paid}
                       disabled={!!e.deleted_at || (!e.approved && !e.paid)}
                       title={!e.approved && !e.paid ? "approve it first" : ""}
                       onChange={(ev) =>
                         act(`pay-${e.recording}`, `/api/ops/episodes/${e.recording}/pay`,
                             { value: ev.target.checked, amount_krw: e.amount_krw || 0 })} />
                {e.paid && e.amount_krw > 0 && (
                  <div className="ops-chip">₩{fmt(e.amount_krw)}</div>
                )}
              </td>
              <td className="ops-del">
                {e.deleted_at ? (
                  <>
                    <span className={`ops-chip ${e.delete_kind === "hard" ? "bad" : ""}`}>
                      {e.delete_kind}
                    </span>
                    {e.delete_kind === "soft" && (
                      <button onClick={() =>
                        act(`res-${e.recording}`, `/api/ops/episodes/${e.recording}/restore`)}>
                        restore
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      title="Hide it here. Every byte stays in the bucket."
                      onClick={() =>
                        act(`sd-${e.recording}`, `/api/ops/episodes/${e.recording}/delete`,
                            { kind: "soft", reason: "" })}>
                      soft
                    </button>
                    <button
                      className="danger"
                      title="Purge the objects from S3. Cannot be undone — the bucket denies deletes to its uploaders, so it cannot be re-uploaded either."
                      onClick={() => {
                        const reason = window.prompt(
                          `HARD DELETE ${e.recording}\n\n` +
                          `${e.size_mb} MB will be purged from S3 and cannot be recovered. ` +
                          `The ledger row survives as a record.\n\nWhy is this worth deleting?`);
                        if (reason === null) return;
                        act(`hd-${e.recording}`, `/api/ops/episodes/${e.recording}/delete`,
                            { kind: "hard", reason });
                      }}>
                      hard
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {preview && (
        <div className="ops-modal-back" onClick={() => setPreview(null)}>
          <div className="ops-modal" onClick={(ev) => ev.stopPropagation()}>
            <header>
              <span className="mono">{preview.recording}</span>
              <button onClick={() => setPreview(null)}>close</button>
            </header>

            {preview.loading && <p className="ops-muted">Signing a link…</p>}

            {!preview.loading && preview.error && (
              <p className="ops-error">{preview.error}</p>
            )}

            {!preview.loading && !preview.error && preview.files.length === 0 && (
              <p className="ops-muted">
                <b>Nothing playable in this episode.</b> Older takes hold a raw{" "}
                <code>capture.egoc</code> container and no mp4 — the video has to be
                exported from it before anything can play it.
              </p>
            )}

            {preview.files.length > 0 && (
              <>
                {preview.files.length > 1 && (
                  <select
                    value={preview.pick}
                    onChange={(ev) => setPreview({ ...preview, pick: Number(ev.target.value) })}
                  >
                    {preview.files.map((f, i) => (
                      <option key={f.name} value={i}>
                        {f.name} · {(f.bytes / 1e6).toFixed(1)} MB
                      </option>
                    ))}
                  </select>
                )}
                {/* Streamed straight from S3 on a presigned URL, so the browser's
                    Range requests fetch only the part actually watched. */}
                <video key={preview.files[preview.pick].url}
                       src={preview.files[preview.pick].url}
                       controls playsInline preload="metadata" />
                <p className="ops-muted">
                  {preview.files[preview.pick].name} ·{" "}
                  {(preview.files[preview.pick].bytes / 1e6).toFixed(1)} MB · streamed
                  from S3, so only the part you watch is fetched.
                </p>
                <p className="ops-muted">
                  Takes are H.265 (hvc1) at 4000×1200 side-by-side. Safari plays them
                  on macOS; Chrome only where it has hardware HEVC. A black player
                  means the browser will not decode it — the file is fine.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {rows.length === 0 && <p className="ops-muted">Nothing matches that filter.</p>}
      {busy && <div className="ops-busy" aria-live="polite">working…</div>}
    </div>
  );
}
