import { Module } from "@nestjs/common";
import { WorkflowService } from "./workflow.service";
import { WorkflowDefinitionController } from "./controllers/workflow-definition.controller";
import { WorkflowInstanceController } from "./controllers/workflow-instance.controller";
import { WorkflowDefinitionService } from "./services/workflow-definition.service";
import { WorkflowInstanceService } from "./services/workflow-instance.service";
import { WorkflowEngineService } from "./services/workflow-engine.service";

@Module({
  controllers: [WorkflowDefinitionController, WorkflowInstanceController],
  providers: [
    WorkflowService,
    WorkflowDefinitionService,
    WorkflowInstanceService,
    WorkflowEngineService,
  ],
  exports: [
    WorkflowService,
    WorkflowDefinitionService,
    WorkflowInstanceService,
    WorkflowEngineService,
  ],
})
export class WorkflowModule {}