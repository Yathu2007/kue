import { createClient } from "@supabase/supabase-js";

process.loadEnvFile("./.env.local");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    try {
        const { data, error } = await supabase
            .from("_test")
            .select("*")
            .limit(1);

        if (
            error &&
            error.message.includes('relation "_test" does not exist')
        ) {
            console.log("✅ Supabase connection successful!");
            console.log(
                '(The error about "_test" not existing is expected - we haven\'t created tables yet)',
            );
        } else if (error) {
            console.log("❌ Connection failed:", error.message);
        } else {
            console.log("✅ Supabase connected!");
        }
    } catch (err) {
        console.log("❌ Error:", err);
    }
}

testConnection();
