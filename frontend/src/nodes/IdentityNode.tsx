import { useTranslation } from "react-i18next";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { User } from "lucide-react";
import { getIdentityTheme } from "../utils/colors";
import "./IdentityNode.css";

export type IdentityNodeData = {
  label: string;
  accountCount: number;
  entityId: string;
};

type IdentityFlowNode = Node<IdentityNodeData, "identity">;

export function IdentityNode({ data, selected }: NodeProps<IdentityFlowNode>) {
  const { t } = useTranslation();
  const theme = getIdentityTheme(data.entityId || data.label);

  return (
    <div
      className={`identity-node-group ${selected ? "identity-node-group--selected" : ""}`}
      style={
        {
          "--node-bg-light": theme.bg,
          "--node-border-light": theme.border,
          "--node-text-light": theme.text,
        } as React.CSSProperties
      }
    >
      <div className="identity-node-group__header">
        <User size={16} className="identity-node-group__icon" />
        <span className="identity-node-group__title">{data.label}</span>
        <span
          className="identity-node-group__badge"
          title={t("nodes.identity.accountsCountTitle", { count: data.accountCount })}
        >
          {data.accountCount}
        </span>
      </div>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}