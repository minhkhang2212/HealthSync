<?php

namespace App\Services\Ai;

use App\Contracts\KnowledgeRetrieverInterface;

class NullKnowledgeRetriever implements KnowledgeRetrieverInterface
{
    public function retrieve(array $context = []): array
    {
        return [];
    }
}
