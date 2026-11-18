use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum StepId {
    Pro12,
    Pro6,
    Pro6b,
    Pro6c,
}

impl StepId {
    pub fn offer_id(&self) -> &'static str {
        match self {
            StepId::Pro12 => "12months-eft",
            StepId::Pro6 => "6months-eft",
            StepId::Pro6b => "6months-eft-2",
            StepId::Pro6c => "6months-eft-ss-2026",
        }
    }

    pub fn requires_token(&self) -> bool {
        !matches!(self, StepId::Pro12)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CheckStatus {
    Pending,
    Running,
    Ok,
    Warning,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvCheckItem {
    pub id: String,
    pub label: String,
    pub status: CheckStatus,
    pub detail: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvReport {
    pub ready: bool,
    pub adb_path: Option<String>,
    pub serial: Option<String>,
    pub abi: Option<String>,
    pub checks: Vec<EnvCheckItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OfferItem {
    pub product: String,
    pub offer_id: String,
    pub micros: String,
    pub period: String,
    pub token: String,
    pub title: String,
    pub name: String,
    pub months: u32,
    pub is_free: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum SolariEvent {
    Log {
        level: String,
        message: String,
        timestamp: String,
    },
    EnvProgress {
        item: EnvCheckItem,
    },
    Offer {
        offer: OfferItem,
    },
    Chosen {
        product: String,
        offer_id: String,
        period: String,
    },
    Launched {
        step_id: StepId,
        code: i32,
        msg: String,
    },
    PurchaseCb {
        step_id: StepId,
        code: i32,
        msg: String,
    },
    StepDone {
        step_id: StepId,
        success: bool,
        message: String,
    },
    Error {
        message: String,
    },
    Cancelled,
}

#[derive(Default)]
pub struct AppState {
    pub adb_path: Mutex<Option<String>>,
    pub serial: Mutex<Option<String>>,
    pub abi: Mutex<Option<String>>,
    pub active_child_pid: Arc<Mutex<Option<u32>>>,
}
