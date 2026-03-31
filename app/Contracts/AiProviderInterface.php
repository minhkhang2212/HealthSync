<?php

namespace App\Contracts;

interface AiProviderInterface
{
    /**
     * @param array<int, array{role:string, content:string}> $messages
     * @param array<string, mixed> $context
     * @return array{
     *     provider:string,
     *     model:string,
     *     assistantMessage:string,
     *     triage:array{
     *         urgency:string,
     *         explanation:string,
     *         redFlags:array<int, string>,
     *         symptomSummary:string,
     *         specialtyCandidates:array<int, array{name:string, reason:string, confidence:float|int}>,
     *         locationHints:array<int, string>,
     *         reasonForVisit:string
     *     }
     * }
     */
    public function analyzeConversation(array $messages, array $context = []): array;
}
