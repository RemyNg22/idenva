import { useTranslation } from "react-i18next";
import { type Node, type NodeProps } from "@xyflow/react";
import "./AccountNode.css";

export type AccountNodeData = {
  label: string;
  hasPassword: boolean;
  has2fa: boolean;
};

type AccountFlowNode = Node<AccountNodeData, "account">;

export function AccountNode({ data, selected }: NodeProps<AccountFlowNode>) {
  const { t } = useTranslation();

  return (
    <div className={`account-node ${selected ? "account-node--selected" : ""}`}>
      <span className="account-node__icon">🔑</span>
      <span className="account-node__name">{data.label}</span>
      <div className="account-node__badges">
        {data.hasPassword && (
          <span className="account-node__badge badge-pwd">
            {t("nodes.account.pwdBadge")}
          </span>
        )}
        {data.has2fa && (
          <span className="account-node__badge badge-2fa">
            {t("nodes.account.twoFaBadge")}
          </span>
        )}
      </div>
    </div>
  );
}