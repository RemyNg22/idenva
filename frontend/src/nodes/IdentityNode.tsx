import { useTranslation } from "react-i18next";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import "./IdentityNode.css";

export type IdentityNodeData = {
  label: string;
  accountCount: number;
};

type IdentityFlowNode = Node<IdentityNodeData, "identity">;

export function IdentityNode({ data, selected }: NodeProps<IdentityFlowNode>) {
  const { t } = useTranslation();

  return (
    <div className={`identity-node-group ${selected ? "identity-node-group--selected" : ""}`}>
      <div className="identity-node-group__header">
        <span className="identity-node-group__icon">👤</span>
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