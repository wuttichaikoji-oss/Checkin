import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  collection,
  query,
  where,
  serverTimestamp,
  runTransaction,
  writeBatch,
  getDocs,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

const $ = (id) => document.getElementById(id);

const els = {
  firebaseStatus: $("firebaseStatus"),
  authStatus: $("authStatus"),
  operatorStatus: $("operatorStatus"),
  uploadBusinessDate: $("uploadBusinessDate"),
  uploadFile: $("uploadFile"),
  replaceTodayData: $("replaceTodayData"),
  previewUploadBtn: $("previewUploadBtn"),
  importUploadBtn: $("importUploadBtn"),
  clearUploadPreviewBtn: $("clearUploadPreviewBtn"),
  uploadMessage: $("uploadMessage"),
  uploadPreviewBody: $("uploadPreviewBody"),
  statRooms: $("statRooms"),
  statGuests: $("statGuests"),
  statEligible: $("statEligible"),
  statNotEligible: $("statNotEligible"),
  packageStats: $("packageStats"),

  foCardCode: $("foCardCode"),
  foSearchCardBtn: $("foSearchCardBtn"),
  foRoomNo: $("foRoomNo"),
  foSearchRoomBtn: $("foSearchRoomBtn"),
  foAssignBtn: $("foAssignBtn"),
  foReassignBtn: $("foReassignBtn"),
  foClearCardBtn: $("foClearCardBtn"),
  foResetBtn: $("foResetBtn"),
  foMessage: $("foMessage"),
  cardStatusPanel: $("cardStatusPanel"),
  roomPreviewPanel: $("roomPreviewPanel"),
  slot1Value: $("slot1Value"),
  slot2Value: $("slot2Value"),
  slotCountText: $("slotCountText"),

  scanCardCode: $("scanCardCode"),
  scanActualPax: $("scanActualPax"),
  scanModeBadge: $("scanModeBadge"),
  scanValidateBtn: $("scanValidateBtn"),
  scanConfirmBtn: $("scanConfirmBtn"),
  scanClearBtn: $("scanClearBtn"),
  scanMessage: $("scanMessage"),
  scanResultCard: $("scanResultCard"),
  scanResultStatus: $("scanResultStatus"),
  scanResultPanel: $("scanResultPanel"),

  logsDate: $("logsDate"),
  logsResultFilter: $("logsResultFilter"),
  logsRoomFilter: $("logsRoomFilter"),
  refreshLogsBtn: $("refreshLogsBtn"),
  exportLogsBtn: $("exportLogsBtn"),
  logsBody: $("logsBody"),

  settingsBusinessDate: $("settingsBusinessDate"),
  settingsCheckinMode: $("settingsCheckinMode"),
  settingsMaxCards: $("settingsMaxCards"),
  settingsAllowAssignNotEligible: $("settingsAllowAssignNotEligible"),
  settingsAllowOverrideConfirm: $("settingsAllowOverrideConfirm"),
  loadSettingsBtn: $("loadSettingsBtn"),
  saveSettingsBtn: $("saveSettingsBtn"),
  settingsMessage: $("settingsMessage"),

  operatorId: $("operatorId"),
  operatorRole: $("operatorRole"),
  deviceName: $("deviceName"),
  saveOperatorBtn: $("saveOperatorBtn"),
};

const DEFAULT_CONFIG = {
  current_business_date: todayInBangkok(),
  checkin_mode: "manual",
  max_active_cards_per_room: 2,
  allow_assign_not_eligible: true,
  allow_override_confirm: false,
  scanner_auto_submit: true,
  default_actual_pax_mode: "use_entitled_pax",
  created_at: null,
  updated_at: null,
  updated_by: "system",
};

const DEFAULT_OPERATOR = Object.assign(
  {
    userId: "fo01",
    role: "fo",
    deviceName: "Breakfast-Station-01",
  },
  window.APP_DEFAULT_OPERATOR || {}
);

const state = {
  app: null,
  db: null,
  auth: null,
  authUid: "",
  config: { ...DEFAULT_CONFIG },
  operator: loadOperator(),
  uploadRows: [],
  currentCard: null,
  currentRoom: null,
  currentScanResult: null,
  logRows: [],
};

init();

function init() {
  bindTabs();
  bindEvents();
  applyOperatorToForm();
  setDefaultDates();

  if (!window.FIREBASE_CONFIG || !window.FIREBASE_CONFIG.apiKey || window.FIREBASE_CONFIG.apiKey.includes("PASTE_YOUR")) {
    setMessage(els.settingsMessage, "Please fill firebase-config.js first.", true);
    els.firebaseStatus.textContent = "Firebase: config missing";
    return;
  }

  try {
    state.app = initializeApp(window.FIREBASE_CONFIG);
    state.db = getFirestore(state.app);
    state.auth = getAuth(state.app);
    els.firebaseStatus.textContent = "Firebase: ready";
    initAuth();
  } catch (error) {
    console.error(error);
    els.firebaseStatus.textContent = "Firebase: init failed";
    setMessage(els.settingsMessage, error.message || "Firebase init failed", true);
  }
}

function bindTabs() {
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      $(btn.dataset.tab).classList.add("active");
      if (btn.dataset.tab === "restaurantTab") {
        focusScanInput();
      }
    });
  });
}

function bindEvents() {
  els.previewUploadBtn.addEventListener("click", previewUploadFile);
  els.importUploadBtn.addEventListener("click", importUploadRows);
  els.clearUploadPreviewBtn.addEventListener("click", clearUploadPreview);

  els.foSearchCardBtn.addEventListener("click", handleSearchCard);
  els.foSearchRoomBtn.addEventListener("click", handleSearchRoom);
  els.foAssignBtn.addEventListener("click", handleAssignCard);
  els.foReassignBtn.addEventListener("click", handleReassignCard);
  els.foClearCardBtn.addEventListener("click", handleClearCard);
  els.foResetBtn.addEventListener("click", resetFoForm);

  els.foCardCode.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearchCard();
    }
  });

  els.foRoomNo.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearchRoom();
    }
  });

  els.scanValidateBtn.addEventListener("click", handleScanValidate);
  els.scanConfirmBtn.addEventListener("click", handleManualConfirm);
  els.scanClearBtn.addEventListener("click", resetScanResult);
  els.scanCardCode.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleScanValidate();
    }
  });

  els.refreshLogsBtn.addEventListener("click", refreshLogs);
  els.exportLogsBtn.addEventListener("click", exportLogsCsv);
  els.logsDate.addEventListener("change", refreshLogs);
  els.logsResultFilter.addEventListener("change", refreshLogs);
  els.logsRoomFilter.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      refreshLogs();
    }
  });

  els.loadSettingsBtn.addEventListener("click", loadSettingsFromFirestore);
  els.saveSettingsBtn.addEventListener("click", saveSettingsToFirestore);

  els.saveOperatorBtn.addEventListener("click", saveOperatorInfo);
}

async function initAuth() {
  try {
    await signInAnonymously(state.auth);
    onAuthStateChanged(state.auth, async (user) => {
      if (!user) return;
      state.authUid = user.uid;
      els.authStatus.textContent = `Auth: anonymous (${user.uid.slice(0, 6)})`;
      refreshOperatorChip();
      await ensureConfig();
      await loadSettingsFromFirestore();
      await refreshLogs();
      focusScanInput();
    });
  } catch (error) {
    console.error(error);
    els.authStatus.textContent = "Auth: failed";
    setMessage(els.settingsMessage, error.message || "Anonymous auth failed. Enable Anonymous Auth.", true);
  }
}

async function ensureConfig() {
  const ref = doc(state.db, "settings", "app_config");
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      ...DEFAULT_CONFIG,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      updated_by: state.operator.userId,
    });
  }
}

async function loadSettingsFromFirestore() {
  try {
    const snap = await getDoc(doc(state.db, "settings", "app_config"));
    if (!snap.exists()) {
      throw new Error("settings/app_config not found");
    }
    state.config = { ...DEFAULT_CONFIG, ...snap.data() };
    applyConfigToForm();
    setMessage(els.settingsMessage, "Settings loaded.");
  } catch (error) {
    console.error(error);
    setMessage(els.settingsMessage, error.message || "Failed to load settings", true);
  }
}

async function saveSettingsToFirestore() {
  try {
    const payload = {
      current_business_date: els.settingsBusinessDate.value || todayInBangkok(),
      checkin_mode: els.settingsCheckinMode.value || "manual",
      max_active_cards_per_room: Number(els.settingsMaxCards.value || 2),
      allow_assign_not_eligible: !!els.settingsAllowAssignNotEligible.checked,
      allow_override_confirm: !!els.settingsAllowOverrideConfirm.checked,
      scanner_auto_submit: true,
      default_actual_pax_mode: "use_entitled_pax",
      updated_at: serverTimestamp(),
      updated_by: state.operator.userId,
    };
    await setDoc(doc(state.db, "settings", "app_config"), payload, { merge: true });
    state.config = { ...state.config, ...payload };
    applyConfigToForm();
    setMessage(els.settingsMessage, "Settings saved.");
  } catch (error) {
    console.error(error);
    setMessage(els.settingsMessage, error.message || "Failed to save settings", true);
  }
}

function applyConfigToForm() {
  els.settingsBusinessDate.value = state.config.current_business_date || todayInBangkok();
  els.settingsCheckinMode.value = state.config.checkin_mode || "manual";
  els.settingsMaxCards.value = String(state.config.max_active_cards_per_room || 2);
  els.settingsAllowAssignNotEligible.checked = !!state.config.allow_assign_not_eligible;
  els.settingsAllowOverrideConfirm.checked = !!state.config.allow_override_confirm;
  els.uploadBusinessDate.value = state.config.current_business_date || todayInBangkok();
  els.logsDate.value = state.config.current_business_date || todayInBangkok();
  els.scanModeBadge.textContent = state.config.checkin_mode || "manual";
}

function setDefaultDates() {
  const date = todayInBangkok();
  els.uploadBusinessDate.value = date;
  els.logsDate.value = date;
  els.settingsBusinessDate.value = date;
}

function loadOperator() {
  try {
    const raw = localStorage.getItem("laya_breakfast_operator");
    if (!raw) return { ...DEFAULT_OPERATOR };
    return { ...DEFAULT_OPERATOR, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_OPERATOR };
  }
}

function saveOperatorInfo() {
  state.operator = {
    userId: (els.operatorId.value || DEFAULT_OPERATOR.userId).trim(),
    role: els.operatorRole.value || "fo",
    deviceName: (els.deviceName.value || DEFAULT_OPERATOR.deviceName).trim(),
  };
  localStorage.setItem("laya_breakfast_operator", JSON.stringify(state.operator));
  refreshOperatorChip();
  setMessage(els.settingsMessage, "Operator info saved in this browser.");
}

function applyOperatorToForm() {
  els.operatorId.value = state.operator.userId;
  els.operatorRole.value = state.operator.role;
  els.deviceName.value = state.operator.deviceName;
  refreshOperatorChip();
}

function refreshOperatorChip() {
  els.operatorStatus.textContent = `Operator: ${state.operator.userId} / ${state.operator.role}`;
}

function setMessage(el, text, isError = false) {
  el.textContent = text || "";
  el.style.color = isError ? "var(--danger)" : "var(--accent-2)";
}

function clearUploadPreview() {
  state.uploadRows = [];
  renderUploadPreview();
  setMessage(els.uploadMessage, "Preview cleared.");
}

async function previewUploadFile() {
  try {
    const file = els.uploadFile.files?.[0];
    if (!file) throw new Error("Please choose an Excel or CSV file first.");

    const rows = await readSheetFile(file);
    state.uploadRows = normalizeUploadRows(rows);
    renderUploadPreview();
    setMessage(els.uploadMessage, `Preview loaded: ${state.uploadRows.length} unique room row(s). Duplicate room rows were merged automatically.`);
  } catch (error) {
    console.error(error);
    setMessage(els.uploadMessage, error.message || "Failed to preview file", true);
  }
}

async function importUploadRows() {
  try {
    if (!state.db) throw new Error("Firebase is not ready.");
    if (!state.uploadRows.length) throw new Error("Please preview a file first.");

    const businessDate = els.uploadBusinessDate.value || state.config.current_business_date || todayInBangkok();
    const replace = !!els.replaceTodayData.checked;

    if (replace) {
      await deleteGuestDailyForDate(businessDate);
    }

    let batch = writeBatch(state.db);
    let count = 0;

    for (const row of state.uploadRows) {
      const docId = buildDateRoomId(businessDate, row.room_no);
      batch.set(doc(state.db, "guest_daily", docId), {
        doc_id: docId,
        business_date: businessDate,
        room_no: row.room_no,
        guest_name: row.guest_name,
        pax: row.pax,
        package: row.package,
        breakfast_eligible: row.breakfast_eligible,
        source: "daily_upload",
        uploaded_at: serverTimestamp(),
        uploaded_by: state.operator.userId,
        notes: row.notes || "",
      });
      count += 1;
      if (count % 400 === 0) {
        await batch.commit();
        batch = writeBatch(state.db);
      }
    }

    await batch.commit();
    await setDoc(doc(state.db, "settings", "app_config"), {
      current_business_date: businessDate,
      updated_at: serverTimestamp(),
      updated_by: state.operator.userId,
    }, { merge: true });

    state.config.current_business_date = businessDate;
    applyConfigToForm();
    setMessage(els.uploadMessage, `Imported ${count} guest room row(s) for ${businessDate}. Business date updated.`);
  } catch (error) {
    console.error(error);
    setMessage(els.uploadMessage, error.message || "Import failed", true);
  }
}

async function deleteGuestDailyForDate(businessDate) {
  const q = query(collection(state.db, "guest_daily"), where("business_date", "==", businessDate));
  const snap = await getDocs(q);
  if (snap.empty) return;
  let batch = writeBatch(state.db);
  let count = 0;
  for (const d of snap.docs) {
    batch.delete(d.ref);
    count += 1;
    if (count % 400 === 0) {
      await batch.commit();
      batch = writeBatch(state.db);
    }
  }
  await batch.commit();
}

function renderUploadPreview() {
  if (!state.uploadRows.length) {
    els.uploadPreviewBody.innerHTML = `<tr><td colspan="6" class="empty">No preview loaded</td></tr>`;
    els.statRooms.textContent = "0";
    els.statGuests.textContent = "0";
    els.statEligible.textContent = "0";
    els.statNotEligible.textContent = "0";
    els.packageStats.innerHTML = "";
    return;
  }

  els.uploadPreviewBody.innerHTML = state.uploadRows
    .slice(0, 500)
    .map((row, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${escapeHtml(row.room_no)}</td>
        <td>${escapeHtml(row.guest_name)}</td>
        <td>${row.pax}</td>
        <td>${escapeHtml(row.package)}</td>
        <td>${row.breakfast_eligible ? "Yes" : "No"}</td>
      </tr>
    `)
    .join("");

  const packages = {};
  let totalPax = 0;
  let eligible = 0;
  for (const row of state.uploadRows) {
    totalPax += row.pax;
    packages[row.package] = (packages[row.package] || 0) + 1;
    if (row.breakfast_eligible) eligible += 1;
  }
  els.statRooms.textContent = String(state.uploadRows.length);
  els.statGuests.textContent = String(totalPax);
  els.statEligible.textContent = String(eligible);
  els.statNotEligible.textContent = String(state.uploadRows.length - eligible);
  els.packageStats.innerHTML = Object.entries(packages)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([pkg, qty]) => `<div class="package-chip"><span>${escapeHtml(pkg)}</span><strong>${qty}</strong></div>`)
    .join("");
}

async function handleSearchCard() {
  try {
    if (!state.db) throw new Error("Firebase is not ready.");
    const cardCode = normalizeCardCode(els.foCardCode.value);
    if (!cardCode) throw new Error("Please scan or enter card code");

    const snap = await getDoc(doc(state.db, "card_bindings", cardCode));
    if (!snap.exists()) {
      state.currentCard = {
        card_code: cardCode,
        status: "CARD NOT FOUND",
        active: false,
      };
      renderCardStatus();
      setMessage(els.foMessage, "Card not found in system", true);
      return;
    }

    state.currentCard = snap.data();
    renderCardStatus();

    if (state.currentCard?.active && state.currentCard?.room_no) {
      els.foRoomNo.value = state.currentCard.room_no;
      state.currentRoom = await searchRoomSummary(state.currentCard.room_no);
      renderRoomPreview();
      setMessage(els.foMessage, `Card loaded. Active room: ${state.currentCard.room_no}.`);
    } else {
      setMessage(els.foMessage, "Card loaded.");
    }
  } catch (error) {
    console.error(error);
    setMessage(els.foMessage, error.message || "Card search failed", true);
  }
}

async function handleSearchRoom() {
  try {
    if (!state.db) throw new Error("Firebase is not ready.");
    const roomNo = normalizeRoomNo(els.foRoomNo.value);
    if (!roomNo) throw new Error("Please enter room number");

    state.currentRoom = await searchRoomSummary(roomNo);
    renderRoomPreview();
    const count = state.currentRoom.activeCards.length;
    if (!state.currentRoom.exists) {
      setMessage(els.foMessage, "Room not found for current business date", true);
      return;
    }

    const eligibleText = state.currentRoom.breakfast_eligible ? "" : " but not eligible for breakfast";
    setMessage(els.foMessage, `Room found. ${count} active card(s)${eligibleText}.`);
  } catch (error) {
    console.error(error);
    setMessage(els.foMessage, error.message || "Room search failed", true);
  }
}

async function searchRoomSummary(roomNo) {
  const businessDate = state.config.current_business_date || todayInBangkok();
  const guestRef = doc(state.db, "guest_daily", buildDateRoomId(businessDate, roomNo));
  const guestSnap = await getDoc(guestRef);

  const activeCardsQ = query(
    collection(state.db, "card_bindings"),
    where("room_no", "==", roomNo),
    where("active", "==", true)
  );
  const activeCardsSnap = await getDocs(activeCardsQ);
  const activeCards = activeCardsSnap.docs.map((d) => d.data()).sort((a, b) => a.card_code.localeCompare(b.card_code));

  const checkinRef = doc(state.db, "room_checkin_daily", buildDateRoomId(businessDate, roomNo));
  const checkinSnap = await getDoc(checkinRef);

  if (!guestSnap.exists()) {
    return {
      exists: false,
      room_no: roomNo,
      guest_name: "",
      pax: 0,
      package: "",
      breakfast_eligible: false,
      activeCards,
      checked_in_today: checkinSnap.exists(),
    };
  }

  const guest = guestSnap.data();
  return {
    exists: true,
    room_no: roomNo,
    guest_name: guest.guest_name || "",
    pax: Number(guest.pax || 0),
    package: guest.package || "",
    breakfast_eligible: !!guest.breakfast_eligible,
    activeCards,
    checked_in_today: checkinSnap.exists(),
  };
}

function renderCardStatus() {
  const data = state.currentCard;
  const panel = els.cardStatusPanel;
  const rows = [
    ["Card Code", data?.card_code || "-"],
    ["Status", !data ? "-" : data.active ? "ACTIVE" : data.status || "UNASSIGNED"],
    ["Current Room", data?.room_no || "-"],
    ["Guest Name", data?.guest_name || "-"],
    ["Assigned At", formatMaybeTimestamp(data?.assigned_at)],
    ["Assigned By", data?.assigned_by || "-"],
  ];
  panel.innerHTML = rows.map(([k, v]) => `<div><span>${k}</span><strong>${escapeHtml(String(v ?? "-"))}</strong></div>`).join("");
}

function renderRoomPreview() {
  const room = state.currentRoom;
  const rows = [
    ["Room No", room?.room_no || "-"],
    ["Guest Name", room?.guest_name || "-"],
    ["Pax", room?.exists ? String(room.pax) : "-"],
    ["Package", room?.package || "-"],
    ["Breakfast Eligible", room ? (room.breakfast_eligible ? "Yes" : "No") : "-"],
    ["Checked-in Today", room ? (room.checked_in_today ? "YES" : "NO") : "-"],
  ];
  els.roomPreviewPanel.innerHTML = rows.map(([k, v]) => `<div><span>${k}</span><strong>${escapeHtml(String(v))}</strong></div>`).join("");

  const activeCards = room?.activeCards || [];
  els.slot1Value.textContent = activeCards[0]?.card_code || "-";
  els.slot2Value.textContent = activeCards[1]?.card_code || "-";
  els.slotCountText.textContent = `${activeCards.length} / ${state.config.max_active_cards_per_room || 2} active cards`;
}

async function handleAssignCard() {
  try {
    const result = await assignCardTx({
      db: state.db,
      userId: state.operator.userId,
      cardCodeInput: els.foCardCode.value,
      roomInput: els.foRoomNo.value,
      allowAssignNotEligible: state.config.allow_assign_not_eligible,
    });
    els.foCardCode.value = result.card_code;
    els.foRoomNo.value = result.room_no;
    await handleSearchCard();
    await handleSearchRoom();
    const msg = result.assigned_as_slot === 2
      ? `Card ${result.card_code} assigned as second active card for room ${result.room_no}`
      : `Card ${result.card_code} assigned to room ${result.room_no}`;
    setMessage(els.foMessage, msg);
  } catch (error) {
    console.error(error);
    setMessage(els.foMessage, friendlyError(error), true);
  }
}

async function handleReassignCard() {
  try {
    const result = await reassignCardTx({
      db: state.db,
      userId: state.operator.userId,
      cardCodeInput: els.foCardCode.value,
      roomInput: els.foRoomNo.value,
      allowAssignNotEligible: state.config.allow_assign_not_eligible,
    });
    els.foCardCode.value = result.card_code;
    els.foRoomNo.value = result.new_room_no;
    await handleSearchCard();
    await handleSearchRoom();
    setMessage(els.foMessage, `Card ${result.card_code} reassigned from ${result.old_room_no || "-"} to ${result.new_room_no}`);
  } catch (error) {
    console.error(error);
    setMessage(els.foMessage, friendlyError(error), true);
  }
}

async function handleClearCard() {
  try {
    const cardCode = normalizeCardCode(els.foCardCode.value);
    if (!cardCode) throw makeAppError("CARD_REQUIRED", "Please scan or enter card code");
    const ok = confirm(`Clear card ${cardCode}?`);
    if (!ok) return;

    const result = await clearCardTx({
      db: state.db,
      userId: state.operator.userId,
      cardCodeInput: cardCode,
    });
    const oldRoom = result.old_room_no;
    await handleSearchCard();
    if (oldRoom) {
      els.foRoomNo.value = oldRoom;
      await handleSearchRoom();
    }
    setMessage(els.foMessage, `Card ${result.card_code} cleared successfully.`);
  } catch (error) {
    console.error(error);
    setMessage(els.foMessage, friendlyError(error), true);
  }
}

function resetFoForm() {
  els.foCardCode.value = "";
  els.foRoomNo.value = "";
  state.currentCard = null;
  state.currentRoom = null;
  renderCardStatus();
  renderRoomPreview();
  setMessage(els.foMessage, "");
  els.foCardCode.focus();
}

async function handleScanValidate() {
  try {
    if (!state.db) throw new Error("Firebase is not ready.");
    const result = await handleRestaurantScan({
      db: state.db,
      userId: state.operator.userId,
      deviceName: state.operator.deviceName,
      cardCodeInput: els.scanCardCode.value,
      checkinMode: state.config.checkin_mode || "manual",
      actualPaxInput: els.scanActualPax.value || null,
    });

    state.currentScanResult = result;
    renderScanResult(result);

    if (result.ok && (state.config.checkin_mode || "manual") === "manual") {
      setMessage(els.scanMessage, "Valid. Press Confirm Check-in.");
      els.scanConfirmBtn.disabled = false;
      return;
    }

    els.scanConfirmBtn.disabled = true;

    if (result.result === "checked_in") {
      setMessage(els.scanMessage, "Breakfast check-in confirmed.");
    } else {
      setMessage(els.scanMessage, result.message || result.result, !result.ok);
    }

    await refreshLogs();
    if ((state.config.checkin_mode || "manual") === "auto" || !result.ok) {
      autoResetScanInput();
    }
  } catch (error) {
    console.error(error);
    setMessage(els.scanMessage, friendlyError(error), true);
    autoResetScanInput();
  }
}

async function handleManualConfirm() {
  try {
    if (!state.currentScanResult?.ok) throw new Error("No valid scan ready to confirm.");
    const result = await confirmCheckinTx({
      db: state.db,
      userId: state.operator.userId,
      deviceName: state.operator.deviceName,
      cardCodeInput: els.scanCardCode.value,
      actualPaxInput: els.scanActualPax.value || null,
    });
    state.currentScanResult = result;
    renderScanResult(result);
    els.scanConfirmBtn.disabled = true;
    setMessage(els.scanMessage, "Breakfast check-in confirmed.");
    await refreshLogs();
    autoResetScanInput();
  } catch (error) {
    console.error(error);
    if (error.code === "ALREADY_CHECKED_IN") {
      const businessDate = state.config.current_business_date || todayInBangkok();
      const payload = {
        ok: false,
        result: "already_checked_in",
        business_date: businessDate,
        card_code: normalizeCardCode(els.scanCardCode.value),
        room_no: state.currentScanResult?.room_no || "",
        guest_name: state.currentScanResult?.guest_name || "",
        entitled_pax: state.currentScanResult?.entitled_pax || 0,
        actual_pax: state.currentScanResult?.actual_pax || 0,
        package: state.currentScanResult?.package || "",
        breakfast_eligible: true,
        message: "Room already checked in today",
        scanned_by: state.operator.userId,
        device_name: state.operator.deviceName,
      };
      await writeScanLog(state.db, payload);
      state.currentScanResult = payload;
      renderScanResult(payload);
      setMessage(els.scanMessage, payload.message, true);
      await refreshLogs();
      autoResetScanInput();
      return;
    }
    setMessage(els.scanMessage, friendlyError(error), true);
    autoResetScanInput();
  }
}

function resetScanResult() {
  state.currentScanResult = null;
  els.scanCardCode.value = "";
  els.scanActualPax.value = "";
  els.scanConfirmBtn.disabled = true;
  renderScanResult(null);
  setMessage(els.scanMessage, "");
  focusScanInput();
}

function renderScanResult(result) {
  const rows = [
    ["Guest Name", result?.guest_name || "-"],
    ["Room No", result?.room_no || "-"],
    ["Entitled Pax", result?.entitled_pax != null ? String(result.entitled_pax) : "-"],
    ["Actual Pax", result?.actual_pax != null ? String(result.actual_pax) : "-"],
    ["Package", result?.package || "-"],
    ["Message", result?.message || "-"],
  ];
  els.scanResultPanel.innerHTML = rows.map(([k, v]) => `<div><span>${k}</span><strong>${escapeHtml(String(v))}</strong></div>`).join("");

  const status = result?.result ? result.result.toUpperCase() : "READY";
  els.scanResultStatus.textContent = status;
  els.scanResultCard.classList.remove("neutral", "success", "warning", "error");

  if (!result) {
    els.scanResultCard.classList.add("neutral");
    return;
  }

  if (result.ok || result.result === "checked_in" || result.result === "valid") {
    els.scanResultCard.classList.add("success");
  } else if (result.result === "already_checked_in") {
    els.scanResultCard.classList.add("warning");
  } else {
    els.scanResultCard.classList.add("error");
  }
}

async function refreshLogs() {
  try {
    if (!state.db) return;
    const businessDate = els.logsDate.value || state.config.current_business_date || todayInBangkok();
    const q = query(
      collection(state.db, "breakfast_logs"),
      where("business_date", "==", businessDate),
      orderBy("scan_time", "desc")
    );
    const snap = await getDocs(q);
    let rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const resultFilter = (els.logsResultFilter.value || "").trim();
    const roomFilter = normalizeRoomNo(els.logsRoomFilter.value || "");

    if (resultFilter) {
      rows = rows.filter((row) => row.result === resultFilter);
    }
    if (roomFilter) {
      rows = rows.filter((row) => normalizeRoomNo(row.room_no) === roomFilter);
    }

    state.logRows = rows;
    renderLogsTable();
  } catch (error) {
    console.error(error);
    setMessage(els.settingsMessage, error.message || "Failed to load logs", true);
  }
}

function renderLogsTable() {
  if (!state.logRows.length) {
    els.logsBody.innerHTML = `<tr><td colspan="10" class="empty">No logs found</td></tr>`;
    return;
  }

  els.logsBody.innerHTML = state.logRows.map((row) => `
    <tr>
      <td>${escapeHtml(formatMaybeTimestamp(row.scan_time))}</td>
      <td>${escapeHtml(row.result || "")}</td>
      <td>${escapeHtml(row.card_code || "")}</td>
      <td>${escapeHtml(row.room_no || "")}</td>
      <td>${escapeHtml(row.guest_name || "")}</td>
      <td>${row.entitled_pax ?? ""}</td>
      <td>${row.actual_pax ?? ""}</td>
      <td>${escapeHtml(row.package || "")}</td>
      <td>${escapeHtml(row.scanned_by || "")}</td>
      <td>${escapeHtml(row.message || "")}</td>
    </tr>
  `).join("");
}

function exportLogsCsv() {
  if (!state.logRows.length) {
    setMessage(els.settingsMessage, "No logs to export.", true);
    return;
  }
  const headers = [
    "business_date","scan_time","result","card_code","room_no","guest_name",
    "entitled_pax","actual_pax","package","breakfast_eligible","device_name","scanned_by","message"
  ];
  const lines = [
    headers.join(","),
    ...state.logRows.map((row) => headers.map((h) => csvCell(
      h === "scan_time" ? formatMaybeTimestamp(row[h]) : row[h]
    )).join(","))
  ];
  downloadTextFile(`breakfast_logs_${els.logsDate.value || todayInBangkok()}.csv`, lines.join("\n"));
}

function csvCell(value) {
  const str = String(value ?? "");
  const escaped = str.replaceAll('"', '""');
  return `"${escaped}"`;
}

async function assignCardTx({ db, userId, cardCodeInput, roomInput, allowAssignNotEligible = true }) {
  const cardCode = normalizeCardCode(cardCodeInput);
  const roomNo = normalizeRoomNo(roomInput);

  if (!cardCode) throw makeAppError("CARD_REQUIRED", "Please scan or enter card code");
  if (!roomNo) throw makeAppError("ROOM_REQUIRED", "Please enter room number");

  return runTransaction(db, async (tx) => {
    const configRef = doc(db, "settings", "app_config");
    const configSnap = await tx.get(configRef);
    if (!configSnap.exists()) throw makeAppError("CONFIG_NOT_FOUND");
    const config = { ...DEFAULT_CONFIG, ...configSnap.data() };
    const businessDate = config.current_business_date;
    const maxCards = config.max_active_cards_per_room || 2;

    const guestRef = doc(db, "guest_daily", buildDateRoomId(businessDate, roomNo));
    const guestSnap = await tx.get(guestRef);
    if (!guestSnap.exists()) {
      throw makeAppError("ROOM_NOT_FOUND", "Room not found for current business date");
    }
    const guest = guestSnap.data();

    if (!guest.breakfast_eligible && !allowAssignNotEligible) {
      throw makeAppError("NOT_ELIGIBLE", "Room is not eligible for breakfast");
    }

    const cardRef = doc(db, "card_bindings", cardCode);
    const cardSnap = await tx.get(cardRef);

    if (cardSnap.exists() && cardSnap.data().active === true) {
      const currentRoom = cardSnap.data().room_no || "";
      if (currentRoom === roomNo) {
        throw makeAppError("CARD_ALREADY_ASSIGNED_TO_THIS_ROOM", "This card is already assigned to this room.");
      }
      throw makeAppError("CARD_ALREADY_ASSIGNED", "This card is already assigned. Use Reassign instead.");
    }

    const activeCardsQ = query(
      collection(db, "card_bindings"),
      where("room_no", "==", roomNo),
      where("active", "==", true)
    );
    const activeCardsSnap = await tx.get(activeCardsQ);
    const activeCount = activeCardsSnap.size;
    if (activeCount >= maxCards) {
      throw makeAppError("ROOM_CARD_LIMIT_REACHED", `This room already has ${maxCards} active cards. Please clear one card first.`);
    }

    const bindingData = {
      card_code: cardCode,
      active: true,
      room_no: roomNo,
      business_date: businessDate,
      guest_name: guest.guest_name || "",
      pax: Number(guest.pax || 0),
      package: guest.package || "",
      breakfast_eligible: !!guest.breakfast_eligible,
      assigned_at: cardSnap.exists() ? cardSnap.data().assigned_at || serverTimestamp() : serverTimestamp(),
      assigned_by: cardSnap.exists() ? cardSnap.data().assigned_by || userId : userId,
      updated_at: serverTimestamp(),
      updated_by: userId,
    };

    const historyRef = doc(collection(db, "card_history"));
    tx.set(cardRef, bindingData, { merge: true });
    tx.set(historyRef, {
      action: "assign",
      card_code: cardCode,
      old_room_no: "",
      new_room_no: roomNo,
      old_active: false,
      new_active: true,
      business_date: businessDate,
      guest_name: guest.guest_name || "",
      done_at: serverTimestamp(),
      done_by: userId,
      remarks: activeCount === 0 ? "assigned as card 1" : "assigned as card 2",
    });

    return {
      ok: true,
      action: "assign",
      card_code: cardCode,
      room_no: roomNo,
      assigned_as_slot: activeCount + 1,
    };
  });
}

async function reassignCardTx({ db, userId, cardCodeInput, roomInput, allowAssignNotEligible = true }) {
  const cardCode = normalizeCardCode(cardCodeInput);
  const targetRoomNo = normalizeRoomNo(roomInput);

  if (!cardCode) throw makeAppError("CARD_REQUIRED", "Please scan or enter card code");
  if (!targetRoomNo) throw makeAppError("ROOM_REQUIRED", "Please enter room number");

  return runTransaction(db, async (tx) => {
    const configRef = doc(db, "settings", "app_config");
    const configSnap = await tx.get(configRef);
    if (!configSnap.exists()) throw makeAppError("CONFIG_NOT_FOUND");

    const config = { ...DEFAULT_CONFIG, ...configSnap.data() };
    const businessDate = config.current_business_date;
    const maxCards = config.max_active_cards_per_room || 2;

    const cardRef = doc(db, "card_bindings", cardCode);
    const cardSnap = await tx.get(cardRef);

    let oldRoomNo = "";
    let oldActive = false;
    let originalAssignedAt = serverTimestamp();
    let originalAssignedBy = userId;

    if (cardSnap.exists()) {
      const oldData = cardSnap.data();
      oldRoomNo = oldData.room_no || "";
      oldActive = !!oldData.active;
      originalAssignedAt = oldData.assigned_at || serverTimestamp();
      originalAssignedBy = oldData.assigned_by || userId;
    }

    if (oldActive && oldRoomNo === targetRoomNo) {
      throw makeAppError("CARD_ALREADY_ASSIGNED_TO_THIS_ROOM", "This card is already assigned to this room.");
    }

    const guestRef = doc(db, "guest_daily", buildDateRoomId(businessDate, targetRoomNo));
    const guestSnap = await tx.get(guestRef);
    if (!guestSnap.exists()) {
      throw makeAppError("ROOM_NOT_FOUND", "Target room not found for current business date");
    }
    const guest = guestSnap.data();

    if (!guest.breakfast_eligible && !allowAssignNotEligible) {
      throw makeAppError("NOT_ELIGIBLE", "Room is not eligible for breakfast");
    }

    const activeCardsQ = query(
      collection(db, "card_bindings"),
      where("room_no", "==", targetRoomNo),
      where("active", "==", true)
    );
    const activeCardsSnap = await tx.get(activeCardsQ);
    const targetActiveCardIds = activeCardsSnap.docs.map((d) => d.id).filter((id) => id !== cardCode);

    if (targetActiveCardIds.length >= maxCards) {
      throw makeAppError("TARGET_ROOM_CARD_LIMIT_REACHED", `Cannot reassign. Target room already has ${maxCards} active cards.`);
    }

    tx.set(cardRef, {
      card_code: cardCode,
      active: true,
      room_no: targetRoomNo,
      business_date: businessDate,
      guest_name: guest.guest_name || "",
      pax: Number(guest.pax || 0),
      package: guest.package || "",
      breakfast_eligible: !!guest.breakfast_eligible,
      assigned_at: originalAssignedAt,
      assigned_by: originalAssignedBy,
      updated_at: serverTimestamp(),
      updated_by: userId,
    }, { merge: true });

    const historyRef = doc(collection(db, "card_history"));
    tx.set(historyRef, {
      action: "reassign",
      card_code: cardCode,
      old_room_no: oldRoomNo,
      new_room_no: targetRoomNo,
      old_active: oldActive,
      new_active: true,
      business_date: businessDate,
      guest_name: guest.guest_name || "",
      done_at: serverTimestamp(),
      done_by: userId,
      remarks: `moved from ${oldRoomNo || "-"} to ${targetRoomNo}`,
    });

    return {
      ok: true,
      action: "reassign",
      card_code: cardCode,
      old_room_no: oldRoomNo,
      new_room_no: targetRoomNo,
    };
  });
}

async function clearCardTx({ db, userId, cardCodeInput }) {
  const cardCode = normalizeCardCode(cardCodeInput);
  if (!cardCode) throw makeAppError("CARD_REQUIRED", "Please scan or enter card code");

  return runTransaction(db, async (tx) => {
    const cardRef = doc(db, "card_bindings", cardCode);
    const cardSnap = await tx.get(cardRef);
    if (!cardSnap.exists()) {
      throw makeAppError("CARD_NOT_FOUND", "Card not found in system");
    }

    const current = cardSnap.data();
    if (!current.active) {
      throw makeAppError("CARD_ALREADY_UNASSIGNED", "This card is already unassigned");
    }

    tx.set(cardRef, {
      card_code: cardCode,
      active: false,
      room_no: "",
      business_date: "",
      guest_name: "",
      pax: 0,
      package: "",
      breakfast_eligible: false,
      assigned_at: null,
      assigned_by: "",
      updated_at: serverTimestamp(),
      updated_by: userId,
    }, { merge: false });

    const historyRef = doc(collection(db, "card_history"));
    tx.set(historyRef, {
      action: "clear",
      card_code: cardCode,
      old_room_no: current.room_no || "",
      new_room_no: "",
      old_active: true,
      new_active: false,
      business_date: current.business_date || "",
      guest_name: current.guest_name || "",
      done_at: serverTimestamp(),
      done_by: userId,
      remarks: "card cleared",
    });

    return {
      ok: true,
      action: "clear",
      card_code: cardCode,
      old_room_no: current.room_no || "",
    };
  });
}

async function validateScan({ db, userId, deviceName, cardCodeInput, actualPaxInput = null }) {
  const cardCode = normalizeCardCode(cardCodeInput);
  if (!cardCode) {
    throw makeAppError("CARD_REQUIRED", "Please scan or enter card code");
  }

  const config = await getAppConfig(db);
  const businessDate = config.current_business_date;

  const cardSnap = await getDoc(doc(db, "card_bindings", cardCode));
  if (!cardSnap.exists()) {
    return invalidResult({
      result: "invalid_card",
      businessDate,
      cardCode,
      message: "Card not found in system",
      userId,
      deviceName,
    });
  }

  const binding = cardSnap.data();
  if (!binding.active || !binding.room_no) {
    return invalidResult({
      result: "unassigned_card",
      businessDate,
      cardCode,
      message: "This card is not assigned to any room",
      userId,
      deviceName,
    });
  }

  const roomNo = binding.room_no;
  const guestSnap = await getDoc(doc(db, "guest_daily", buildDateRoomId(businessDate, roomNo)));
  if (!guestSnap.exists()) {
    return {
      ok: false,
      result: "room_not_found",
      business_date: businessDate,
      card_code: cardCode,
      room_no: roomNo,
      guest_name: binding.guest_name || "",
      entitled_pax: Number(binding.pax || 0),
      actual_pax: 0,
      package: binding.package || "",
      breakfast_eligible: !!binding.breakfast_eligible,
      message: "Assigned room not found in today's guest list",
      scanned_by: userId,
      device_name: deviceName,
    };
  }

  const guest = guestSnap.data();
  if (!guest.breakfast_eligible) {
    return {
      ok: false,
      result: "not_eligible",
      business_date: businessDate,
      card_code: cardCode,
      room_no: roomNo,
      guest_name: guest.guest_name || "",
      entitled_pax: Number(guest.pax || 0),
      actual_pax: 0,
      package: guest.package || "",
      breakfast_eligible: false,
      message: "Room is not eligible for breakfast",
      scanned_by: userId,
      device_name: deviceName,
    };
  }

  const checkinRef = doc(db, "room_checkin_daily", buildDateRoomId(businessDate, roomNo));
  const checkinSnap = await getDoc(checkinRef);
  if (checkinSnap.exists()) {
    return {
      ok: false,
      result: "already_checked_in",
      business_date: businessDate,
      card_code: cardCode,
      room_no: roomNo,
      guest_name: guest.guest_name || "",
      entitled_pax: Number(guest.pax || 0),
      actual_pax: Number(guest.pax || 0),
      package: guest.package || "",
      breakfast_eligible: true,
      message: "Room already checked in today",
      scanned_by: userId,
      device_name: deviceName,
    };
  }

  const entitledPax = Number(guest.pax || 0);
  const actualPax = parseActualPax(actualPaxInput, entitledPax);

  return {
    ok: true,
    result: "valid",
    business_date: businessDate,
    card_code: cardCode,
    room_no: roomNo,
    guest_name: guest.guest_name || "",
    entitled_pax: entitledPax,
    actual_pax: actualPax,
    package: guest.package || "",
    breakfast_eligible: true,
    message: "Ready for breakfast check-in",
    scanned_by: userId,
    device_name: deviceName,
  };
}

function invalidResult({ result, businessDate, cardCode, message, userId, deviceName }) {
  return {
    ok: false,
    result,
    business_date: businessDate,
    card_code: cardCode,
    room_no: "",
    guest_name: "",
    entitled_pax: 0,
    actual_pax: 0,
    package: "",
    breakfast_eligible: false,
    message,
    scanned_by: userId,
    device_name: deviceName,
  };
}

async function writeScanLog(db, payload) {
  return addDoc(collection(db, "breakfast_logs"), {
    business_date: payload.business_date || "",
    scan_time: serverTimestamp(),
    card_code: payload.card_code || "",
    room_no: payload.room_no || "",
    guest_name: payload.guest_name || "",
    entitled_pax: payload.entitled_pax || 0,
    actual_pax: payload.actual_pax || 0,
    package: payload.package || "",
    breakfast_eligible: !!payload.breakfast_eligible,
    result: payload.result || "",
    message: payload.message || "",
    device_name: payload.device_name || "",
    scanned_by: payload.scanned_by || "",
  });
}

async function confirmCheckinTx({ db, userId, deviceName, cardCodeInput, actualPaxInput = null }) {
  const cardCode = normalizeCardCode(cardCodeInput);
  if (!cardCode) throw makeAppError("CARD_REQUIRED", "Please scan or enter card code");

  return runTransaction(db, async (tx) => {
    const configRef = doc(db, "settings", "app_config");
    const configSnap = await tx.get(configRef);
    if (!configSnap.exists()) throw makeAppError("CONFIG_NOT_FOUND");

    const config = configSnap.data();
    const businessDate = config.current_business_date;

    const cardRef = doc(db, "card_bindings", cardCode);
    const cardSnap = await tx.get(cardRef);
    if (!cardSnap.exists()) throw makeAppError("INVALID_CARD", "Card not found in system");

    const binding = cardSnap.data();
    if (!binding.active || !binding.room_no) {
      throw makeAppError("UNASSIGNED_CARD", "This card is not assigned to any room");
    }

    const roomNo = binding.room_no;
    const guestRef = doc(db, "guest_daily", buildDateRoomId(businessDate, roomNo));
    const guestSnap = await tx.get(guestRef);
    if (!guestSnap.exists()) {
      throw makeAppError("ROOM_NOT_FOUND", "Assigned room not found in today's guest list");
    }

    const guest = guestSnap.data();
    if (!guest.breakfast_eligible) {
      throw makeAppError("NOT_ELIGIBLE", "Room is not eligible for breakfast");
    }

    const roomCheckinRef = doc(db, "room_checkin_daily", buildDateRoomId(businessDate, roomNo));
    const roomCheckinSnap = await tx.get(roomCheckinRef);
    if (roomCheckinSnap.exists()) {
      throw makeAppError("ALREADY_CHECKED_IN", "Room already checked in today");
    }

    const entitledPax = Number(guest.pax || 0);
    const actualPax = parseActualPax(actualPaxInput, entitledPax);

    const logRef = doc(collection(db, "breakfast_logs"));

    tx.set(roomCheckinRef, {
      doc_id: buildDateRoomId(businessDate, roomNo),
      business_date: businessDate,
      room_no: roomNo,
      checked_in: true,
      first_checkin_at: serverTimestamp(),
      first_card_code: cardCode,
      guest_name: guest.guest_name || "",
      entitled_pax: entitledPax,
      actual_pax: actualPax,
      package: guest.package || "",
      confirmed_by: userId,
      device_name: deviceName,
      log_ref_id: logRef.id,
    });

    tx.set(logRef, {
      business_date: businessDate,
      scan_time: serverTimestamp(),
      card_code: cardCode,
      room_no: roomNo,
      guest_name: guest.guest_name || "",
      entitled_pax: entitledPax,
      actual_pax: actualPax,
      package: guest.package || "",
      breakfast_eligible: true,
      result: "checked_in",
      message: "valid check-in",
      device_name: deviceName,
      scanned_by: userId,
    });

    return {
      ok: true,
      result: "checked_in",
      card_code: cardCode,
      room_no: roomNo,
      guest_name: guest.guest_name || "",
      entitled_pax: entitledPax,
      actual_pax: actualPax,
      package: guest.package || "",
      message: "Breakfast check-in confirmed",
      log_id: logRef.id,
    };
  });
}

async function handleRestaurantScan({ db, userId, deviceName, cardCodeInput, checkinMode, actualPaxInput = null }) {
  const validation = await validateScan({ db, userId, deviceName, cardCodeInput, actualPaxInput });

  if (!validation.ok) {
    await writeScanLog(db, validation);
    return validation;
  }

  if (checkinMode === "manual") {
    return validation;
  }

  try {
    return await confirmCheckinTx({ db, userId, deviceName, cardCodeInput, actualPaxInput });
  } catch (error) {
    if (error.code === "ALREADY_CHECKED_IN") {
      const alreadyPayload = {
        ...validation,
        ok: false,
        result: "already_checked_in",
        message: "Room already checked in today",
      };
      await writeScanLog(db, alreadyPayload);
      return alreadyPayload;
    }
    throw error;
  }
}

async function readSheetFile(file) {
  if (file.name.toLowerCase().endsWith(".csv")) {
    const text = await file.text();
    const workbook = XLSX.read(text, { type: "string" });
    const firstSheet = workbook.SheetNames[0];
    return XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: "" });
  }

  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const firstSheet = workbook.SheetNames[0];
  return XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: "" });
}

function normalizeUploadRows(rows) {
  const mergedByRoom = new Map();

  for (const raw of rows) {
    const mapped = mapUploadRow(raw);
    if (!mapped.room_no) continue;

    const existing = mergedByRoom.get(mapped.room_no);
    if (!existing) {
      mergedByRoom.set(mapped.room_no, {
        ...mapped,
        guest_names: splitGuestNames(mapped.guest_name),
      });
      continue;
    }

    const mergedGuestNames = mergeGuestNameArrays(existing.guest_names, splitGuestNames(mapped.guest_name));
    existing.guest_names = mergedGuestNames;
    existing.guest_name = mergedGuestNames.join(" / ");
    existing.pax = Math.max(existing.pax, mapped.pax, mergedGuestNames.length || 0);
    existing.package = pickBetterPackage(existing.package, mapped.package);
    existing.breakfast_eligible = existing.breakfast_eligible || mapped.breakfast_eligible;
    existing.notes = [existing.notes, mapped.notes].filter(Boolean).join(" | ");
  }

  return Array.from(mergedByRoom.values())
    .map(({ guest_names, ...row }) => row)
    .sort((a, b) => a.room_no.localeCompare(b.room_no));
}

function splitGuestNames(raw) {
  return String(raw || "")
    .split(/[\/;&|]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function mergeGuestNameArrays(left, right) {
  const seen = new Set();
  const result = [];
  for (const name of [...(left || []), ...(right || [])]) {
    const key = name.toUpperCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }
  return result;
}

function pickBetterPackage(a, b) {
  return packageRank(b) > packageRank(a) ? b : a;
}

function packageRank(pkg) {
  switch (normalizePackage(pkg)) {
    case "EXECUTIVE":
      return 70;
    case "AI":
      return 60;
    case "FB":
      return 50;
    case "HB":
      return 40;
    case "BB":
      return 30;
    case "RB":
      return 20;
    case "RO":
      return 10;
    default:
      return 15;
  }
}

function mapUploadRow(raw) {
  const source = {};
  for (const [key, value] of Object.entries(raw || {})) {
    source[normalizeHeader(key)] = value;
  }

  const roomNo = normalizeRoomNo(
    firstDefined(source, ["roomno", "roomnumber", "room", "room_no", "roomnum"])
  );

  const guestNameRaw = firstDefined(source, [
    "guestname", "guest", "name", "fullname", "guest_name", "customername"
  ]);
  const guestName = String(guestNameRaw || "").trim() || roomNo;

  const paxRaw = firstDefined(source, [
    "pax", "adults", "adult", "guestcount", "guests", "heads", "persons"
  ]);
  const pax = Math.max(0, Number(paxRaw || 0)) || 1;

  const packageRaw = String(firstDefined(source, [
    "package", "mealplan", "meal_plan", "ratecode", "plan", "boardtype"
  ]) || "").trim();
  const pkg = normalizePackage(packageRaw);

  let breakfastEligible;
  const explicitEligible = firstDefined(source, ["breakfasteligible", "eligible", "hasbreakfast"]);
  if (explicitEligible !== undefined && explicitEligible !== "") {
    breakfastEligible = normalizeBoolean(explicitEligible);
  } else {
    breakfastEligible = deriveBreakfastEligible(pkg);
  }

  return {
    room_no: roomNo,
    guest_name: guestName,
    pax,
    package: pkg,
    breakfast_eligible: breakfastEligible,
    notes: String(firstDefined(source, ["notes", "remark", "remarks"]) || "").trim(),
  };
}

function normalizeHeader(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function firstDefined(obj, keys) {
  for (const key of keys) {
    if (obj[key] !== undefined) return obj[key];
  }
  return undefined;
}

function normalizePackage(raw) {
  const value = String(raw || "").trim().toUpperCase();
  if (!value) return "RO";
  if (["RO", "ROOM ONLY", "OTARO"].includes(value)) return "RO";
  if (["RB", "ROOM BREAKFAST"].includes(value)) return "RB";
  if (["BB", "BED BREAKFAST", "BED & BREAKFAST", "B&B"].includes(value)) return "BB";
  if (["HB", "HALF BOARD"].includes(value)) return "HB";
  if (["FB", "FULL BOARD"].includes(value)) return "FB";
  if (["AI", "AIP", "ALL INCLUSIVE"].includes(value)) return "AI";
  if (["EXEC", "EXECUTIVE", "EXBF", "EXECUTIVE BREAKFAST", "EXECUTIVE BF"].includes(value)) return "EXECUTIVE";
  return value;
}

function deriveBreakfastEligible(pkg) {
  return !["", "RO"].includes(pkg);
}

function normalizeBoolean(value) {
  const v = String(value).trim().toLowerCase();
  return ["1", "true", "yes", "y"].includes(v);
}

function parseActualPax(raw, fallback) {
  if (raw == null || raw === "") return Number(fallback || 0);
  const num = Number(raw);
  if (!Number.isFinite(num) || num < 0) return Number(fallback || 0);
  return Math.floor(num);
}

function buildDateRoomId(businessDate, roomNo) {
  return `${businessDate}_${roomNo}`;
}

function normalizeCardCode(raw) {
  return String(raw || "").trim().toUpperCase();
}

function normalizeRoomNo(raw) {
  return String(raw || "").trim().toUpperCase();
}

function makeAppError(code, message) {
  const err = new Error(message || code);
  err.code = code;
  return err;
}

async function getAppConfig(db) {
  const snap = await getDoc(doc(db, "settings", "app_config"));
  if (!snap.exists()) throw makeAppError("CONFIG_NOT_FOUND", "App config not found");
  return { ...DEFAULT_CONFIG, ...snap.data() };
}

function friendlyError(error) {
  if (!error) return "Unknown error";
  return error.message || error.code || String(error);
}

function todayInBangkok() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.filter(p => p.type !== "literal").map(p => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function formatMaybeTimestamp(value) {
  if (!value) return "-";
  try {
    if (typeof value?.toDate === "function") {
      return formatDateTime(value.toDate());
    }
    if (value instanceof Date) {
      return formatDateTime(value);
    }
    if (typeof value === "string") {
      return value;
    }
    return String(value);
  } catch {
    return String(value);
  }
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(date);
}

function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function autoResetScanInput() {
  setTimeout(() => {
    resetScanResult();
  }, 1400);
}

function focusScanInput() {
  setTimeout(() => els.scanCardCode?.focus(), 50);
}

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
