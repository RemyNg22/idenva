import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import "./IdentityNode.css";

export type IdentityNodeData = {
  label: string;
  accountCount: number;
};

type IdentityFlowNode = Node<IdentityNodeData, "identity">;

export function IdentityNode({ data, selected }: NodeProps<IdentityFlowNode>) {
  return (
    <div className={`identity-node ${selected ? "identity-node--selected" : ""}`}>
      <Handle type="target" position={Position.Top} />
      <div className="identity-node__name">{data.label}</div>
      <div className="identity-node__meta">
        {data.accountCount} compte{data.accountCount > 1 ? "s" : ""}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}