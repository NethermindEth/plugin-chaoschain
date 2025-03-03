import {
    elizaLogger,
    Action,
    ActionExample,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
    generateObject,
    ModelClass,
    composeContext,
    Content,
} from "@elizaos/core";
import { validateChaoschainConfig } from "../environment.ts";
import { proposeTransactionService } from "../services.ts";
import { proposeTransactionExamples } from "../examples/actionExamples.ts";
import { TransactionProposal } from "../types.ts";
import { ProposeBlockSchema } from "../utils/schemas.ts";
import { proposeBlockTemplate } from "../utils/templates.ts";
import { z } from "zod";

export type ProposeBlockContent = z.infer<typeof ProposeBlockSchema> & Content;
export const isProposeBlockContent = (
    obj: unknown
): obj is ProposeBlockContent => {
    return ProposeBlockSchema.safeParse(obj).success;
};

export const proposeTransactionAction: Action = {
    name: "CHAOSCHAIN_PROPOSE_TRANSACTION",
    similes: ["TRANSACTION", "PROPOSE CONTENT", "CHAOSCHAIN"],
    description:
        "Proposes a creative transaction to ChaosChain with a drama rating.",
    validate: async (runtime: IAgentRuntime) => {
        await validateChaoschainConfig(runtime);
        return true;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback: HandlerCallback
    ) => {
        const config = await validateChaoschainConfig(runtime);
        const chaoschainService = proposeTransactionService();

        let currentState = state;
        if (!currentState) {
            currentState = await runtime.composeState(message);
        } else {
            currentState = await runtime.updateRecentMessageState(currentState);
        }

        const blockContext = composeContext({
            state: currentState,
            template: proposeBlockTemplate,
        });

        const result = await generateObject({
        runtime,
        context: blockContext,
        modelClass: ModelClass.LARGE,
        schema: ProposeBlockSchema,
        });

        const { agent_id, agent_token } = JSON.parse(
            await runtime.cacheManager.get(message.roomId)
        );

        console.log("AGENT DETAILS", agent_id, agent_token);

        if (!agent_id || !agent_token) {
            callback({
                text: "Agent credentials are missing. Register the agent first.",
            });
            return false;
        }

        try {
            // const transaction = {
            //     source: "ElizaAgent",
            //     content: "I am loving the chaos",
            //     drama_level: 7,
            //     justification: "This transaction embodies peak drama and must be recorded!",
            //     tags: ["drama", "chaos", "intensity"],
            // };

            await chaoschainService.propose(
                result.object,
                agent_id,
                agent_token
            );

            elizaLogger.success("[ChaosChain] Transaction proposal submitted.");
            callback({
                text: "Transaction proposal submitted successfully.",
            });
            return true;
        } catch (error: any) {
            elizaLogger.error(
                "[ChaosChain] Error proposing transaction:",
                error
            );
            callback({
                text: `Error proposing transaction: ${error.message}`,
                content: { error: error.message },
            });
            return false;
        }
    },
    examples: proposeTransactionExamples as ActionExample[][],
} as Action;

