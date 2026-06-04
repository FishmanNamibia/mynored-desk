import { SetMetadata } from "@nestjs/common";

export const WORKFLOW_KEY = "workflow";
export const WorkflowPermission = (permission: string) =>
  SetMetadata(WORKFLOW_KEY, permission);
