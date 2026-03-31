<?php

namespace App\Contracts;

interface KnowledgeRetrieverInterface
{
    /**
     * @param array<string, mixed> $context
     * @return array<int, array<string, mixed>>
     */
    public function retrieve(array $context = []): array;
}
