export class CreateWorkflowDefinitionDto {
  name: string = "";
  description?: string;
  module: string = "";
  category?: string;
  icon?: string;
  config?: any;
  steps?: CreateWorkflowStepDto[];
}

export class CreateWorkflowStepDto {
  name: string = "";
  order: number = 0;
  state: string = "";
  assignmentType: "ROLE" | "USER" | "DYNAMIC" = "ROLE";
  assignmentConfig: any = {};
  requiresApproval?: boolean;
  allowsComment?: boolean;
  canEdit?: boolean;
  expectedDuration?: number;
  escalationDuration?: number;
  escalationConfig?: any;
  nextStepsConfig: any = {};
}

export class UpdateWorkflowDefinitionDto {
  name?: string;
  description?: string;
  module?: string;
  category?: string;
  icon?: string;
  config?: any;
  isActive?: boolean;
  version?: number;
}
