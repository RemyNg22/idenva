import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import "./AccountNode.css";

export type AccountNodeData = {
  label: string;
  hasPassword: boolean;
  has2fa: boolean;
};

type AccountFlowNode = Node<AccountNodeData, "account">;

export function AccountNode({ data, selected }: NodeProps<AccountFlowNode>) {
  return (
    <div className={`account-node ${selected ? "account-node--selected" : ""}`}>
      <Handle type="target" position={Position.Top} />
      <div className="account-node__name">{data.label}</div>
      <div className="account-node__badges">
        {data.hasPassword && <span className="account-node__badge">🔑</span>}
        {data.has2fa && <span className="account-node__badge">✓ 2FA</span>}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}