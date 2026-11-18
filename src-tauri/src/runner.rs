//! Download/cache do frida-inject-16.5.9, envio do module_521.apk e streaming JSON via stdout.

pub const MODULE_APK_BYTES: &[u8] = include_bytes!("../assets/module_521.apk");
pub const BILLING_RUNNER_JS: &str = include_str!("../assets/billing_runner.js");
