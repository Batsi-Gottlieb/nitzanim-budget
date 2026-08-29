"use client";

import { useState } from "react";
import Link from "next/link";
import { MONTHS } from "@/lib/types";

export type TreeNode = {
  id: string;
  label: string;
  href?: string;
  expensesMonthly: number[];
  incomeMonthly: number[];
  children: TreeNode[];
  category?: string;
};

function fmt(n: number) {
  return n.toLocaleString("he-IL", { maximumFractionDigits: 0 });
}

function sumTo(arr: number[], cutoff: number) {
  return arr.slice(0, cutoff).reduce((s, v) => s + v, 0);
}

export function ReportsTree({ root }: { root: TreeNode }) {
  const [cutoff, setCutoff] = useState(10);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <label className="text-foreground-muted">חתך תקציב עד חודש:</label>
        <select
          value={cutoff}
          onChange={(e) => setCutoff(Number(e.target.value))}
          className="rounded-md border border-border px-2 py-1"
        >
          {MONTHS.map((m) => (
            <option key={m.month_order} value={m.month_order}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
      <div className="rounded-2xl border border-border bg-surface">
        <TreeRow node={root} depth={0} cutoff={cutoff} defaultOpen />
      </div>
    </div>
  );
}

function TreeRow({ node, depth, cutoff, defaultOpen }: { node: TreeNode; depth: number; cutoff: number; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const expenses = sumTo(node.expensesMonthly, cutoff);
  const income = sumTo(node.incomeMonthly, cutoff);
  const net = income - expenses;
  const hasChildren = node.children.length > 0;

  return (
    <div className="border-b border-border last:border-0">
      <div
        className="flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-surface-muted"
        style={{ paddingRight: `${1 + depth * 1.25}rem` }}
        onClick={() => hasChildren && setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2 text-sm">
          {hasChildren && <span className="text-foreground-muted">{open ? "▾" : "◂"}</span>}
          {node.href ? (
            <Link href={node.href} onClick={(e) => e.stopPropagation()} className="font-medium text-primary hover:underline">
              {node.label}
            </Link>
          ) : (
            <span className="font-medium">{node.label}</span>
          )}
        </div>
        <div className="flex gap-6 text-sm tabular-nums">
          <span>
            הוצאות: <span className="font-semibold">{fmt(expenses)}</span>
          </span>
          <span className="text-success">
            הכנסות: <span className="font-semibold">{fmt(income)}</span>
          </span>
          <span className={net >= 0 ? "text-success" : "text-danger"}>
            נטו: <span className="font-semibold">{fmt(net)}</span>
          </span>
        </div>
      </div>
      {open && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeRow key={child.id} node={child} depth={depth + 1} cutoff={cutoff} />
          ))}
        </div>
      )}
    </div>
  );
}
