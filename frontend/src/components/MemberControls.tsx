import { useState } from "react";
import { errorMessage } from "../api/client";
import { useApproveMember, useRemoveMember } from "../api/hooks";
import type { Member } from "../api/types";
import { useToast } from "./Toast";

/** Owner controls for one member: approve a pending member, remove with an inline confirm. */
export function MemberControls({ m, projectId }: { m: Member; projectId: string }) {
  const [asking, setAsking] = useState(false);
  const remove = useRemoveMember(projectId);
  const approve = useApproveMember(projectId);
  const toast = useToast();
  if (m.is_owner) return null;
  if (asking)
    return (
      <span className="row" style={{ gap: 6 }}>
        <span className="small">Remove {m.first_name}?</span>
        <button
          className="btn danger sm"
          type="button"
          autoFocus
          disabled={remove.isPending}
          onClick={() =>
            remove.mutate(m.id, {
              onSuccess: () => toast(`${m.first_name} was removed and their tasks unassigned`),
              onError: (e) => toast(errorMessage(e)),
            })
          }
        >
          Remove
        </button>
        <button className="btn sm" type="button" onClick={() => setAsking(false)}>
          Keep
        </button>
      </span>
    );
  return (
    <span className="row" style={{ gap: 6 }}>
      {!m.approved && (
        <button
          className="btn primary sm"
          type="button"
          disabled={approve.isPending}
          onClick={() => approve.mutate(m.id, { onSuccess: () => toast(`${m.first_name} is approved`), onError: (e) => toast(errorMessage(e)) })}
        >
          Approve
        </button>
      )}
      <button className="btn sm ghost" type="button" onClick={() => setAsking(true)}>
        Remove
      </button>
    </span>
  );
}
