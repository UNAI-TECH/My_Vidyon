// ============================================================
// File: src/components/common/PermissionField.tsx
// Purpose: Permission-aware wrapper rendering FormField or children
// in a read-only/greyed-out state whenever can(user, module, action) is false.
// ============================================================

import React from 'react';
import { useRBAC } from '../../hooks/useRBAC';
import { Action, ERPModule, RBACResource } from '../../types/rbac';
import { FormField, FormFieldProps } from './FormField';

export interface PermissionFieldProps extends Omit<FormFieldProps, 'children'> {
  module: ERPModule;
  action?: Action;
  resource?: RBACResource | null;
  deniedReason?: string;
  children?:
    | React.ReactNode
    | ((props: { readOnly: boolean; disabled: boolean; disabledReason?: string }) => React.ReactNode);
}

export const PermissionField: React.FC<PermissionFieldProps> = ({
  module,
  action = 'edit',
  resource,
  deniedReason = 'View-only access for your role',
  children,
  readOnly: explicitReadOnly = false,
  disabled: explicitDisabled = false,
  disabledReason: explicitReason,
  ...formFieldProps
}) => {
  const { can, isStakeholder } = useRBAC();

  // Evaluate whether the user has permission to perform this action (normalize lowercase)
  const normAction = (action ? action.toLowerCase() : 'edit') as Action;
  const normModule = (module ? module.toLowerCase() : 'faculty') as ERPModule;
  const isPermitted = can(normModule, normAction, resource);

  // If not permitted, enforce read-only & greyed out state
  const effectiveReadOnly = explicitReadOnly || !isPermitted;
  const effectiveDisabled = explicitDisabled;
  const effectiveReason =
    explicitReason ||
    (!isPermitted
      ? isStakeholder
        ? 'Stakeholder view-only mode'
        : deniedReason
      : undefined);

  // If children is provided as a render function
  if (typeof children === 'function') {
    return (
      <>
        {children({
          readOnly: effectiveReadOnly,
          disabled: effectiveDisabled,
          disabledReason: effectiveReason,
        })}
      </>
    );
  }

  // If plain children provided, wrap them
  if (children) {
    return <>{children}</>;
  }

  // Otherwise render standard FormField with permission enforcement
  return (
    <FormField
      readOnly={effectiveReadOnly}
      disabled={effectiveDisabled}
      disabledReason={effectiveReason}
      {...formFieldProps}
    />
  );
};
