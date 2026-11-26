import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { ApiError, errorMessage } from "../api/client";
import { useDeleteProject, useGeneratePlan, useNewInviteCode, usePlan, useUpdateProject } from "../api/hooks";
import type { Member, ProjectBundle } from "../api/types";
import { Field, Input, Textarea } from "../components/Field";
import { Icon } from "../components/Icon";
import { MemberControls } from "../components/MemberControls";
import { useAiOverlay } from "../components/LoadingOverlay";
import { Modal } from "../components/Modal";
import { useCopy, useToast } from "../components/Toast";
import { Avatar, Button, Notice, PageHead } from "../components/ui";
import { ProjectPage } from "../layout/ProjectPage";
import { redesignSteps } from "../lib/aiSteps";
import { todayISO } from "../lib/format";
import { MSG, type Errors } from "../lib/validate";

function DetailsForm({ b, onDescriptionChanged }: { b: ProjectBundle; onDescriptionChanged: () => void }) {
  const p = b.project;
  const [f, setF] = useState({ title: p.title, description: p.description, deadline: p.deadline, context: p.context });
  const [errors, setErrors] = useState<Errors>({});
  const update = useUpdateProject(p.id);
  const toast = useToast();
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const errs: Errors = {};
    if (!f.title.trim()) errs.title = MSG.title;
    if (f.description.trim().length < 100) errs.description = MSG.descShort;
    if (!f.deadline || f.deadline < todayISO()) errs.deadline = MSG.deadlinePast;
    setErrors(errs);
    if (Object.keys(errs).length) return;
    update.mutate(
      { title: f.title.trim(), description: f.description.trim(), deadline: f.deadline, context: f.context.trim() },
      {
        onSuccess: (r) => {
          if (r.description_changed) onDescriptionChanged();
          else toast("Details saved");
        },
        onError: (e2) => (e2 instanceof ApiError && Object.keys(e2.fields).length ? setErrors(e2.fields) : toast(errorMessage(e2))),
      },
    );
  };

  return (
    <form className="panel pad stack" onSubmit={onSubmit} noValidate>
      <h2>Details</h2>
      <Field label="Title" error={errors.title}>
        {(a) => <Input {...a} maxLength={100} value={f.title} onChange={(e) => set("title")(e.target.value)} />}
      </Field>
      <Field label="Description" hint="Changing the description asks whether to regenerate the role plan." error={errors.description}>
        {(a) => <Textarea {...a} style={{ minHeight: 140 }} maxLength={3000} value={f.description} onChange={(e) => set("description")(e.target.value)} />}
      </Field>
      <div className="grid2">
        <Field label="Deadline" error={errors.deadline}>
          {(a) => <Input {...a} type="date" min={todayISO()} value={f.deadline} onChange={(e) => set("deadline")(e.target.value)} />}
        </Field>
        <Field label="Course or context" error={errors.context}>
          {(a) => <Input {...a} maxLength={100} value={f.context} onChange={(e) => set("context")(e.target.value)} />}
        </Field>
      </div>
      <div>
        <button className="btn primary" type="submit" disabled={update.isPending}>
          Save details
        </button>
      </div>
    </form>
  );
}

function MemberRow({ m, projectId }: { m: Member; projectId: string }) {
  return (
    <div className="memberrow">
      <Avatar person={m} />
      <div className="nm">
        <b className="small">{m.name}</b>
        <div className="small muted">
          {m.is_owner ? "Owner · " : ""}
          {m.approved ? (m.seat_name ?? "No role yet") : "Waiting for approval"}
        </div>
      </div>
      <MemberControls m={m} projectId={projectId} />
    </div>
  );
}

function DeleteProject({ b }: { b: ProjectBundle }) {
  const p = b.project;
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState("");
  const del = useDeleteProject(p.id);
  const toast = useToast();
  const navigate = useNavigate();
  const close = () => {
    setOpen(false);
    setTyped("");
    setError("");
  };
  const matches = typed.trim() === p.title.trim();
  const onDelete = () =>
    del.mutate(undefined, {
      onSuccess: () => {
        navigate("/projects", { replace: true });
        toast(`Project "${p.title}" was deleted`);
      },
      onError: (e) => setError(errorMessage(e)),
    });

  return (
    <div className="panel pad stack" style={{ gap: 10 }}>
      <h3>Delete project</h3>
      <p className="small muted">
        Removes the project for all {b.members.length} {b.members.length === 1 ? "member" : "members"}: role plan, matching, RACI and tasks. This cannot be undone.
      </p>
      <div>
        <Button variant="danger" size="sm" onClick={() => setOpen(true)}>
          Delete project
        </Button>
      </div>
      {open && (
        <Modal title="Delete this project?" onClose={close}>
          <p>
            <b>{p.title}</b> and everything in it will be deleted for the whole team. This cannot be undone.
          </p>
          {error && <Notice tone="bad">{error}</Notice>}
          <Field label="Type the project title to confirm">
            {(a) => <Input {...a} value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={p.title} data-autofocus autoComplete="off" />}
          </Field>
          <div className="row">
            <Button variant="danger" disabled={!matches || del.isPending} onClick={onDelete}>
              Delete project
            </Button>
            <Button onClick={close}>Cancel</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Settings({ b }: { b: ProjectBundle }) {
  const p = b.project;
  const [askRegen, setAskRegen] = useState(false);
  const plan = usePlan(p.id);
  const regen = useGeneratePlan(p.id);
  const newCode = useNewInviteCode(p.id);
  const { run, overlay } = useAiOverlay();
  const copy = useCopy();
  const toast = useToast();
  const navigate = useNavigate();
  const [aiError, setAiError] = useState("");

  if (!b.is_owner) {
    return (
      <>
        <PageHead eyebrow="Settings" title="Project settings" sub="Only the owner can change these." />
        <Notice tone="warn">Only the project owner can open settings.</Notice>
      </>
    );
  }

  const onRegenerate = async () => {
    setAskRegen(false);
    try {
      await run("Redesigning roles", redesignSteps(false, p.team_size), () => regen.mutateAsync(""));
      navigate(`/p/${p.id}/plan`);
      toast("New draft ready. Review it, then approve.");
    } catch (e) {
      setAiError(errorMessage(e));
    }
  };

  const hasPlan = (plan.data?.seats.length ?? 0) > 0;
  const clears = plan.data?.has_matching || plan.data?.has_raci;

  return (
    <>
      <PageHead eyebrow="Settings" title="Project settings" sub="Only the owner can change these." />
      {aiError && (
        <div style={{ marginBottom: 16 }}>
          <Notice tone="bad">{aiError}</Notice>
        </div>
      )}
      <div className="split">
        <DetailsForm
          b={b}
          onDescriptionChanged={() => {
            if (hasPlan) setAskRegen(true);
            else toast("Details saved");
          }}
        />
        <div className="stack">
          <div className="panel pad stack" style={{ gap: 10 }}>
            <h3>Invite code</h3>
            <div className="invite">
              <span className="code">{p.invite_code}</span>
              <Button size="sm" icon="copy" onClick={() => copy(p.invite_code)}>
                Copy
              </Button>
            </div>
            <div>
              <Button
                size="sm"
                icon="refresh"
                disabled={newCode.isPending}
                onClick={() => newCode.mutate(undefined, { onSuccess: (r) => toast("New code: " + r.project.invite_code), onError: (e) => toast(errorMessage(e)) })}
              >
                Make a new code
              </Button>
            </div>
            <p className="small muted">The old code stops working right away.</p>
          </div>
          <div className="panel pad stack" style={{ gap: 4 }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <h3>Members</h3>
              <span className="mono small muted">
                {b.members.length} / {p.team_size}
              </span>
            </div>
            {b.members.map((m) => (
              <MemberRow key={m.id} m={m} projectId={p.id} />
            ))}
          </div>
          <DeleteProject b={b} />
        </div>
      </div>
      {askRegen && (
        <Modal title="Regenerate the role plan?" onClose={() => (setAskRegen(false), toast("Details saved"))}>
          <p>Details saved. The description changed, so the current roles may no longer fit. Regenerate the role plan from the new description?</p>
          {clears && <Notice tone="warn">This replaces the roles. Matching and RACI will be cleared.</Notice>}
          <div className="row">
            <button className="btn primary" type="button" onClick={onRegenerate} data-autofocus>
              <Icon name="refresh" />
              Regenerate
            </button>
            <button className="btn" type="button" onClick={() => (setAskRegen(false), toast("Details saved"))}>
              Keep current plan
            </button>
          </div>
        </Modal>
      )}
      {overlay}
    </>
  );
}

export function SettingsPage() {
  return <ProjectPage active="settings">{(b) => <Settings b={b} />}</ProjectPage>;
}
