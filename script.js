// State Management
const order = {
    name: "",
    id: "",
    items: {} // Will contain keys like "2026_jersey_manga_corta"
};

let currentYear = "2026"; // Current active year being viewed
let isSubmitted = false;

// Configuration defaults
let config = {
    whatsapp: "521234567890", 
    sheetUrl: ""
};

// DOM Elements
const customerNameInput = document.getElementById("customer-name");
const previewNameSpan = document.getElementById("preview-name");
const orderIdValueSpan = document.getElementById("order-id-value");
const summaryEmptyDiv = document.getElementById("summary-empty");
const summaryContentDiv = document.getElementById("summary-content");
const summaryItemsList = document.getElementById("summary-items");
const totalCountSpan = document.getElementById("total-count");
const btnSubmit = document.getElementById("btn-submit");
const btnEditOrder = document.getElementById("btn-edit-order");
const customerInfoBlock = document.getElementById("customer-info-block");
const confirmationSummaryBlock = document.getElementById("confirmation-summary-block");
const confirmationName = document.getElementById("confirmation-name");
const confirmationId = document.getElementById("confirmation-id");
const confirmationTotal = document.getElementById("confirmation-total");
const catalogGrid = document.getElementById("catalog-grid");
const statusToast = document.getElementById("status-toast");
const toastMessage = document.getElementById("toast-message");
const activeYearIndicator = document.getElementById("active-year-indicator");
const historicalNotice = document.getElementById("historical-notice");

// Year Switcher elements
const yearTabs = document.querySelectorAll(".year-tab");
const historicalSelectWrapper = document.getElementById("historical-select-wrapper");
const historicalYearSelect = document.getElementById("historical-year-select");

// Modal Config Elements
const configModal = document.getElementById("config-modal");
const btnConfig = document.getElementById("btn-config");
const btnCloseConfig = document.getElementById("btn-close-config");
const btnSaveConfig = document.getElementById("btn-save-config");
const cfgWhatsappInput = document.getElementById("cfg-whatsapp");
const cfgSheetUrlInput = document.getElementById("cfg-sheet-url");

function getOrCreateOrderId() {
    const savedId = localStorage.getItem("uh_order_id");
    if (savedId) return savedId;

    const newId = `pedido-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem("uh_order_id", newId);
    return newId;
}

function saveOrderState() {
    const snapshot = {
        name: order.name,
        id: order.id,
        currentYear,
        isSubmitted,
        items: Object.values(order.items).reduce((acc, item) => {
            acc[item.productId] = {
                year: item.year,
                productId: item.productId,
                name: item.name,
                qty: item.qty,
                gender: item.gender,
                size: item.size,
                special: item.special
            };
            return acc;
        }, {})
    };

    localStorage.setItem("uh_order_state", JSON.stringify(snapshot));
}

function loadOrderState() {
    const savedState = localStorage.getItem("uh_order_state");
    if (!savedState) return;

    try {
        const parsed = JSON.parse(savedState);
        if (!parsed) return;

        order.name = parsed.name || "";
        order.id = parsed.id || getOrCreateOrderId();
        currentYear = parsed.currentYear || currentYear;
        isSubmitted = Boolean(parsed.isSubmitted);

        if (parsed.items) {
            Object.keys(parsed.items).forEach(productId => {
                const item = parsed.items[productId];
                const key = `${item.year}_${productId}`;
                order.items[key] = {
                    year: item.year,
                    productId,
                    name: item.name || getBaseProductName(productId),
                    qty: Number(item.qty) || 0,
                    gender: item.gender || (productId.endsWith("_dama") ? "Dama" : "Caballero"),
                    size: item.size || "M",
                    special: item.special || ""
                };
            });
        }
    } catch (error) {
        console.warn("No se pudo cargar el estado guardado del pedido", error);
    }
}

// Initialize application
document.addEventListener("DOMContentLoaded", () => {
    order.id = getOrCreateOrderId();
    loadOrderState();
    updateOrderIdDisplay();
    if (customerNameInput) {
        customerNameInput.value = order.name;
    }
    if (previewNameSpan) {
        previewNameSpan.textContent = order.name || "No ingresado";
    }
    loadConfig();
    ensureProductFieldNames();
    setupEventListeners();
    repaintCatalog(currentYear);
    renderSummary();

    if (isSubmitted) {
        const totalPrendas = parseInt(totalCountSpan.textContent, 10) || 0;
        showConfirmationView(totalPrendas, true);
    }
});

function ensureProductFieldNames() {
    document.querySelectorAll(".product-card").forEach(card => {
        const productId = card.getAttribute("data-product-id");
        const productName = card.getAttribute("data-product-name") || "";
        const qtyInput = card.querySelector(".qty-input");
        const genderSelect = card.querySelector(".gender-select");
        const sizeSelect = card.querySelector(".size-select");
        const specialInput = card.querySelector(".special-input");

        if (qtyInput) qtyInput.name = `${productId}_qty`;
        if (genderSelect) genderSelect.name = `${productId}_gender`;
        if (sizeSelect) sizeSelect.name = `${productId}_size`;
        if (specialInput) specialInput.name = `${productId}_special`;

        let productNameInput = card.querySelector(".product-name-input");
        if (!productNameInput) {
            productNameInput = document.createElement("input");
            productNameInput.type = "hidden";
            productNameInput.className = "product-name-input";
            card.appendChild(productNameInput);
        }
        productNameInput.name = `${productId}_name`;
        productNameInput.value = productName;
    });
}

function updateOrderIdDisplay() {
    if (orderIdValueSpan) {
        orderIdValueSpan.textContent = order.id || "Sin ID";
    }
}

// Load Configuration from LocalStorage
function loadConfig() {
    const savedWhatsapp = localStorage.getItem("uh_whatsapp");
    const savedSheetUrl = localStorage.getItem("uh_sheet_url");
    
    if (savedWhatsapp) {
        config.whatsapp = savedWhatsapp;
        cfgWhatsappInput.value = savedWhatsapp;
    }
    if (savedSheetUrl) {
        config.sheetUrl = savedSheetUrl;
        cfgSheetUrlInput.value = savedSheetUrl;
    }
}

// Get or initialize state for a specific year and product
function getItemState(year, productId) {
    const key = `${year}_${productId}`;
    if (!order.items[key]) {
        // Enterizos are dama-only: default gender to "Dama"
        const defaultGender = productId.endsWith("_dama") ? "Dama" : "Caballero";
        order.items[key] = {
            year: year,
            productId: productId,
            name: getBaseProductName(productId),
            qty: 0,
            gender: defaultGender,
            size: "M",
            special: ""
        };
    }
    return order.items[key];
}

// Map base ID to printable name
function getBaseProductName(productId) {
    const names = {
        jersey_manga_corta: "Jersey Manga Corta",
        jersey_manga_larga: "Jersey Manga Larga",
        short_con_tirantes: "Short con Tirantes",
        short_sin_tirantes: "Short sin Tirantes",
        enterizo_manga_corta_dama: "Enterizo Manga Corta (Dama)",
        enterizo_manga_larga_dama: "Enterizo Manga Larga (Dama)",
        cortaviento_impermeable: "Cortaviento & Impermeable",
        playera_polo: "Playera Tipo Polo"
    };
    return names[productId] || productId;
}

// Repaint catalog cards with data from selected year
function repaintCatalog(year) {
    activeYearIndicator.textContent = `Edición ${year}`;

    // Toggle historical notice
    if (historicalNotice) {
        if (year !== "2026") {
            historicalNotice.classList.remove("hidden");
        } else {
            historicalNotice.classList.add("hidden");
        }
    }

    document.querySelectorAll(".product-card").forEach(card => {
        const productId = card.getAttribute("data-product-id");
        const itemState = getItemState(year, productId);
        
        // Update DOM elements on the card
        const qtyInput = card.querySelector(".qty-input");
        const genderSelect = card.querySelector(".gender-select");   // may be null (enterizos)
        const sizeSelect = card.querySelector(".size-select");
        const specialInput = card.querySelector(".special-input");   // may be null (enterizos)
        const specialRow = card.querySelector(".special-detail-row"); // may be null (enterizos)
        
        qtyInput.value = itemState.qty;
        if (genderSelect) genderSelect.value = itemState.gender;
        sizeSelect.value = itemState.size;
        if (specialInput) specialInput.value = itemState.special || "";
        
        // Handle "Otro" visibility (only on cards that have this element)
        if (specialRow) {
            if (itemState.gender === "Otro") {
                specialRow.classList.remove("hidden");
            } else {
                specialRow.classList.add("hidden");
            }
        }
        
        // Show/Hide image based on year (Historical items don't show reference images)
        const imageContainer = card.querySelector(".product-image-container");
        if (imageContainer) {
            if (year === "2026") {
                imageContainer.classList.remove("hidden");
                updateCardImage(card, productId, itemState.gender);
            } else {
                imageContainer.classList.add("hidden");
            }
        }
        
        // Handle active class
        updateCardActiveState(card, itemState.qty);
    });

    saveOrderState();
}

// Dynamically update product images based on gender selection
function updateCardImage(card, productId, gender) {
    const imgElement = card.querySelector(".product-img");
    if (!imgElement) return;

    let newSrc;

    // Case 1: Enterizos (dama-only) — image name already includes the full key
    if (productId === "enterizo_manga_corta_dama" || productId === "enterizo_manga_larga_dama") {
        newSrc = `images/${productId}.jpg`;

    // Case 2: Products with a single unisex image (no gender suffix)
    } else if (productId === "playera_polo") {
        newSrc = "images/playera_tipo_polo.jpg";

    } else if (productId === "cortaviento_impermeable") {
        newSrc = "images/rompevientos_manga_larga.jpg";

    // Case 3: Shorts — reuse jersey_manga_corta image with gender suffix
    } else if (productId === "short_con_tirantes" || productId === "short_sin_tirantes") {
        const genderKey = (gender === "Dama") ? "dama" : "caballero";
        newSrc = `images/jersey_manga_corta_${genderKey}.jpg`;

    // Case 4: Standard products with gender-specific images
    } else {
        const genderKey = (gender === "Dama") ? "dama" : "caballero";
        newSrc = `images/${productId}_${genderKey}.jpg`;
    }

    imgElement.src = newSrc;
    
    // Reset display styles if previously hidden by onerror
    imgElement.parentElement.style.display = "";
    imgElement.style.display = "";
}

// Setup Event Listeners
function setupEventListeners() {
    // Customer Name Input
    customerNameInput.addEventListener("input", (e) => {
        order.name = e.target.value.trim();
        previewNameSpan.textContent = order.name || "No ingresado";
        validateForm();
        saveOrderState();
    });

    // Year Switcher Tabs
    yearTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            yearTabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            
            const targetType = tab.getAttribute("data-target-type");
            if (targetType === "current") {
                historicalSelectWrapper.classList.add("hidden");
                currentYear = "2026";
            } else {
                historicalSelectWrapper.classList.remove("hidden");
                currentYear = historicalYearSelect.value;
            }
            
            repaintCatalog(currentYear);
        });
    });

    // Historical Year Dropdown
    historicalYearSelect.addEventListener("change", (e) => {
        currentYear = e.target.value;
        repaintCatalog(currentYear);
    });

    // Product Cards Events (Stepper & Dropdowns)
    document.querySelectorAll(".product-card").forEach(card => {
        const productId = card.getAttribute("data-product-id");
        const btnMinus = card.querySelector(".btn-qty-minus");
        const btnPlus = card.querySelector(".btn-qty-plus");
        const qtyInput = card.querySelector(".qty-input");
        const genderSelect = card.querySelector(".gender-select");   // null for enterizos
        const sizeSelect = card.querySelector(".size-select");
        const specialInput = card.querySelector(".special-input");   // null for enterizos
        const specialRow = card.querySelector(".special-detail-row"); // null for enterizos

        // Stepper Minus
        btnMinus.addEventListener("click", () => {
            const itemState = getItemState(currentYear, productId);
            if (itemState.qty > 0) {
                itemState.qty--;
                qtyInput.value = itemState.qty;
                updateCardActiveState(card, itemState.qty);
                renderSummary();
            }
        });

        // Stepper Plus
        btnPlus.addEventListener("click", () => {
            const itemState = getItemState(currentYear, productId);
            if (itemState.qty < 99) {
                itemState.qty++;
                qtyInput.value = itemState.qty;
                updateCardActiveState(card, itemState.qty);
                renderSummary();
            }
        });

        // Gender Select (only on cards that have it)
        if (genderSelect) {
            genderSelect.addEventListener("change", (e) => {
                const itemState = getItemState(currentYear, productId);
                itemState.gender = e.target.value;
                
                if (itemState.gender === "Otro") {
                    if (specialRow) specialRow.classList.remove("hidden");
                } else {
                    if (specialRow) specialRow.classList.add("hidden");
                    itemState.special = "";
                    if (specialInput) specialInput.value = "";
                }
                
                // Dynamic image change on selection
                updateCardImage(card, productId, itemState.gender);
                
                renderSummary();
                saveOrderState();
                saveOrderState();
                saveOrderState();
            });
        }

        // Size Select
        sizeSelect.addEventListener("change", (e) => {
            const itemState = getItemState(currentYear, productId);
            itemState.size = e.target.value;
            renderSummary();
            saveOrderState();
        });

        // Special Detail Input (only on cards that have it)
        if (specialInput) {
            specialInput.addEventListener("input", (e) => {
                const itemState = getItemState(currentYear, productId);
                itemState.special = e.target.value.trim();
                renderSummary();
                saveOrderState();
            });
        }
    });

    // Configuration Modal
    btnConfig.addEventListener("click", () => {
        const accessKey = window.prompt("Introduce la clave de acceso para configurar destinos:");

        // Clave de acceso: FORZABIKE10
        if (accessKey === "FORZABIKE10") {
            cfgWhatsappInput.value = config.whatsapp;
            cfgSheetUrlInput.value = config.sheetUrl;
            configModal.classList.remove("hidden");
        } else if (accessKey !== null) {
            showToast("Clave incorrecta. Acceso denegado.");
        }
    });

    btnCloseConfig.addEventListener("click", () => {
        configModal.classList.add("hidden");
    });

    configModal.addEventListener("click", (e) => {
        if (e.target === configModal) {
            configModal.classList.add("hidden");
        }
    });

    btnSaveConfig.addEventListener("click", () => {
        let whatsappNum = cfgWhatsappInput.value.trim().replace(/\D/g, ""); 
        let sheetUrl = cfgSheetUrlInput.value.trim();

        if (!whatsappNum) {
            showToast("Ingresa un número de WhatsApp válido.");
            return;
        }

        config.whatsapp = whatsappNum;
        config.sheetUrl = sheetUrl;

        localStorage.setItem("uh_whatsapp", whatsappNum);
        localStorage.setItem("uh_sheet_url", sheetUrl);

        configModal.classList.add("hidden");
        showToast("Configuración guardada correctamente");
    });

    // Form Submission
    btnSubmit.addEventListener("click", handleSubmit);
    btnEditOrder.addEventListener("click", handleEditOrder);
}

// Update Active Class on Card
function updateCardActiveState(card, qty) {
    if (qty > 0) {
        card.classList.add("active");
    } else {
        card.classList.remove("active");
    }
}

// Render Order Summary
function renderSummary() {
    summaryItemsList.innerHTML = "";
    let totalPrendas = 0;
    let hasItems = false;

    // Loop through all keys in order.items
    for (const [key, item] of Object.entries(order.items)) {
        if (item.qty > 0) {
            hasItems = true;
            totalPrendas += item.qty;

            // Create list item elements
            const li = document.createElement("li");
            li.className = "summary-item";
            
            // Build gender/size/special detail presentation
            let metaString = `${item.gender} - Talla ${item.size}`;
            if (item.gender === "Otro" && item.special) {
                metaString = `Esp: ${item.special} - Talla ${item.size}`;
            }

            li.innerHTML = `
                <div class="item-name">
                    <span>${item.name}</span>
                    <div class="item-meta">
                        <span class="item-badge-year">[Ed. ${item.year}]</span>
                        <span>${metaString}</span>
                    </div>
                </div>
                <span class="item-qty">x${item.qty}</span>
            `;
            summaryItemsList.appendChild(li);
        }
    }

    totalCountSpan.textContent = totalPrendas;

    // Toggle Empty / Content panels
    if (hasItems) {
        summaryEmptyDiv.classList.add("hidden");
        summaryContentDiv.classList.remove("hidden");
    } else {
        summaryEmptyDiv.classList.remove("hidden");
        summaryContentDiv.classList.add("hidden");
    }

    validateForm();
    saveOrderState();
}

// Form Validation logic
function validateForm() {
    if (isSubmitted) return;

    const totalPrendas = parseInt(totalCountSpan.textContent) || 0;
    const isNameValid = order.name.trim().length > 0;
    const isOrderValid = totalPrendas > 0;

    btnSubmit.disabled = !(isNameValid && isOrderValid);
}

// Show toast feedback
function showToast(message, duration = 3000) {
    toastMessage.textContent = message;
    statusToast.classList.remove("hidden");
    setTimeout(() => {
        statusToast.classList.add("hidden");
    }, duration);
}

// Handle Order Submission
async function handleSubmit() {
    const totalPrendas = parseInt(totalCountSpan.textContent) || 0;
    
    if (!order.name.trim()) {
        showToast("Por favor, ingresa tu nombre antes de enviar.");
        return;
    }
    if (totalPrendas === 0) {
        showToast("Por favor, agrega al menos una prenda a tu pedido.");
        return;
    }

    if (isSubmitted) {
        showToast("Este pedido ya fue enviado.");
        return;
    }

    // Set UI to loading state
    btnSubmit.disabled = true;
    btnSubmit.classList.add("loading");
    btnSubmit.innerHTML = `
        <svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite;"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
        Registrando pedido...
    `;

    // 1. Save to Google Sheets if API URL configured
    if (config.sheetUrl) {
        try {
            showToast("Guardando datos en Google Sheets...");
            
            const payload = buildSheetPayload(totalPrendas);

            await fetch(config.sheetUrl, {
                method: "POST",
                mode: "no-cors",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });
            
            showToast("¡Pedido guardado en Google Sheets!");
        } catch (error) {
            console.error("Error al guardar en Google Sheets:", error);
            showToast("No se pudo guardar en Google Sheets, abriremos WhatsApp.");
        }
    }

    // Small delay for UX
    await new Promise(resolve => setTimeout(resolve, 800));

    // 2. Redirect to WhatsApp
    redirectToWhatsApp(totalPrendas);

    // Reset Submit Button
    btnSubmit.classList.remove("loading");
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="btn-icon"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        Confirmar y Enviar Pedido
    `;

    saveOrderState();
    showConfirmationView(totalPrendas);
}

function showConfirmationView(totalPrendas, isRestore = false) {
    isSubmitted = true;
    customerInfoBlock.classList.add("hidden");
    confirmationSummaryBlock.classList.remove("hidden");
    confirmationName.textContent = order.name || "No ingresado";
    confirmationId.textContent = order.id || "Sin ID";
    confirmationTotal.textContent = `${totalPrendas} prendas`;
    catalogGrid.classList.add("form-locked");
    btnSubmit.classList.add("hidden");
    btnEditOrder.classList.remove("hidden");

    // Forzar que el contenedor del resumen sea visible para que el botón "Editar" aparezca
    summaryEmptyDiv.classList.add("hidden");
    summaryContentDiv.classList.remove("hidden");

    document.querySelectorAll(".product-card, .year-tab, .year-dropdown, .qty-stepper button, .gender-select, .size-select, .special-input").forEach(el => {
        el.style.pointerEvents = "none";
        el.style.opacity = "0.7";
    });
    if (customerNameInput) {
        customerNameInput.value = order.name;
    }
    document.querySelectorAll(".year-tab.active").forEach(el => {
        el.style.opacity = "1";
    });
    saveOrderState();
    if (!isRestore) {
        showToast("Pedido confirmado. Puedes editarlo solo si lo vuelves a abrir para modificar.");
    }
}

function handleEditOrder() {
    if (!isSubmitted) return;

    const shouldEdit = window.confirm("¿Deseas editar este pedido antes de enviarlo nuevamente?");
    if (!shouldEdit) {
        return;
    }

    isSubmitted = false;
    customerInfoBlock.classList.remove("hidden");
    confirmationSummaryBlock.classList.add("hidden");
    catalogGrid.classList.remove("form-locked");
    btnSubmit.classList.remove("hidden");
    btnEditOrder.classList.add("hidden");
    document.querySelectorAll(".product-card, .year-tab, .year-dropdown, .qty-stepper button, .gender-select, .size-select, .special-input").forEach(el => {
        el.style.pointerEvents = "";
        el.style.opacity = "";
    });
    validateForm();
    saveOrderState();
    showToast("Puedes modificar el pedido nuevamente.");
}

function buildSheetPayload(totalPrendas) {
    const itemsArray = [];

    // Recorremos todos los productos que tengan cantidad mayor a 0
    for (const item of Object.values(order.items)) {
        if (item.qty > 0) {
            itemsArray.push({
                name: item.name,
                size: item.size,
                qty: item.qty,
                year: item.year,
                gender: item.gender,
                special: item.special || ""
            });
        }
    }

    return {
        pedido_id: order.id,
        cliente: order.name,
        fecha: new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" }),
        items: itemsArray
    };
}

// Helper to format string representation of items in a single year for Sheets cell
function getFormattedYearGroup(year) {
    const list = [];
    for (const [key, item] of Object.entries(order.items)) {
        if (item.year === year && item.qty > 0) {
            let detail = `${item.gender} - Talla ${item.size}`;
            if (item.gender === "Otro" && item.special) {
                detail = `Otro (${item.special}) - Talla ${item.size}`;
            }
            list.push(`${item.qty}x ${item.name} [${detail}]`);
        }
    }
    return list.join(" | ");
}

// Helper to format representation of all historical items for Sheets cell
function getFormattedHistoricalGroup() {
    const list = [];
    // Sort keys to display oldest/newest chronologically
    const sortedItems = Object.values(order.items).sort((a, b) => b.year - a.year);
    
    for (const item of sortedItems) {
        if (item.year !== "2026" && item.qty > 0) {
            let detail = `${item.gender} - Talla ${item.size}`;
            if (item.gender === "Otro" && item.special) {
                detail = `Otro (${item.special}) - Talla ${item.size}`;
            }
            list.push(`[${item.year}] ${item.qty}x ${item.name} [${detail}]`);
        }
    }
    return list.join(" | ");
}

// Create message template and redirect to WhatsApp
function redirectToWhatsApp(totalPrendas) {
    let message = `*🚴‍♂️ NUEVO PEDIDO DE UNIFORMES 🚴‍♀️*\n`;
    message += `*🏆 FORZABIKE - 10º ANIVERSARIO 🏆*\n\n`;
    message += `*Cliente:* ${order.name}\n`;
    message += `*Fecha:* ${new Date().toLocaleDateString("es-MX")}\n\n`;

    // 2026 Collection Group
    let currentBlock = "";
    for (const [key, item] of Object.entries(order.items)) {
        if (item.year === "2026" && item.qty > 0) {
            let detail = `*${item.gender}* - Talla: *${item.size}*`;
            if (item.gender === "Otro" && item.special) {
                detail = `*Especial:* _${item.special}_ - Talla: *${item.size}*`;
            }
            currentBlock += `• *${item.qty}x* ${item.name} (${detail})\n`;
        }
    }
    
    if (currentBlock) {
        message += `*✨ COLECCIÓN ACTUAL 2026 ✨*\n${currentBlock}\n`;
    }

    // Historical Group
    let historicalBlock = "";
    const sortedItems = Object.values(order.items).sort((a, b) => b.year - a.year);
    for (const item of sortedItems) {
        if (item.year !== "2026" && item.qty > 0) {
            let detail = `*${item.gender}* - Talla: *${item.size}*`;
            if (item.gender === "Otro" && item.special) {
                detail = `*Especial:* _${item.special}_ - Talla: *${item.size}*`;
            }
            historicalBlock += `• *${item.qty}x* [Ed. ${item.year}] ${item.name} (${detail})\n`;
        }
    }

    if (historicalBlock) {
        message += `*⏳ EDICIONES ANTERIORES ⏳*\n${historicalBlock}\n`;
    }

    message += `*Total de prendas solicitadas:* ${totalPrendas}\n\n`;
    message += `_Enviado desde el portal conmemorativo de uniformes FORZABIKE._`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappLink = `https://wa.me/${config.whatsapp}?text=${encodedMessage}`;
    
    window.open(whatsappLink, "_blank");
}

// CSS Injection for dynamic loading spinner rotation
const style = document.createElement("style");
style.innerHTML = `
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
`;
document.head.appendChild(style);
