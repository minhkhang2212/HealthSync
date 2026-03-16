<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('allcodes')) {
            return;
        }

        $validTimeKeys = array_map(
            static fn (int $index): string => "T{$index}",
            range(1, 16)
        );

        DB::table('allcodes')
            ->where('type', 'TIME')
            ->whereNotIn('key', $validTimeKeys)
            ->delete();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Legacy time-slot rows are intentionally not restored.
    }
};
