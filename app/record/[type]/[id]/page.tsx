"use client";

import { useParams } from "next/navigation";
import { ErrorState, PageHeader } from "../../../components/ui";
import { RecordView } from "../../../components/RecordView";
import { tableFromSlug } from "@/lib/domain";

/**
 * The loader page: /record/<type>/<id> opens any record in full. Lists,
 * cards and reference cells all link here rather than each growing their
 * own detail screen.
 */
export default function RecordPage() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const table = tableFromSlug(type);

  if (!table) {
    return (
      <>
        <PageHeader title="Record not found" />
        <div className="work-inner page-body">
          <ErrorState
            title="That kind of record can't be opened"
            message="The link may be out of date."
          />
        </div>
      </>
    );
  }

  // Keyed so moving from one record to another (a reference link, say)
  // starts from a clean loading state instead of flashing the last record.
  return <RecordView key={`${table}/${id}`} table={table} sysId={id} />;
}
