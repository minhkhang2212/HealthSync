<?php

namespace App\Providers;

use App\Contracts\AiProviderInterface;
use App\Contracts\KnowledgeRetrieverInterface;
use App\Services\Ai\NullKnowledgeRetriever;
use App\Services\Ai\OpenAiTriageProvider;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(KnowledgeRetrieverInterface::class, NullKnowledgeRetriever::class);

        $this->app->singleton(AiProviderInterface::class, function () {
            return new OpenAiTriageProvider();
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
