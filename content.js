let fullSelection = null;
let partialSelection = null;

// Function to wrap text in a span
function highlightSelection(selection, className) {
  const range = selection.getRangeAt(0);
  const span = document.createElement("span");
  span.classList.add(className);
  span.style.backgroundColor =
    className === "full-highlight" ? "yellow" : "orange";
  span.style.cursor = "pointer";

  range.surroundContents(span);
  return span.innerText;
}

// Function to clear all selections
function clearSelections() {
  document
    .querySelectorAll(".full-highlight, .partial-highlight")
    .forEach((el) => el.replaceWith(el.innerText));
  fullSelection = null;
  partialSelection = null;
  console.log("Selections cleared. Ready for new selection.");
}

// Function to clear only the partial selection
function clearPartialSelection() {
  document
    .querySelectorAll(".partial-highlight")
    .forEach((el) => el.replaceWith(el.innerText));
  partialSelection = null;
  console.log("Partial selection cleared. Ready for new partial selection.");
}

async function callAzureOpenAIUsingFetch(context, keyPhrase) {
  // Load API keys from config.json
  const config = await fetch(chrome.runtime.getURL("config.json")).then(
    (response) => response.json()
  );

  const prompt = `Given the context: """${context}""", explain what ""${keyPhrase}"" means.`;

  try {
    const response = await fetch(
      `${config.AZURE_OPENAI_ENDPOINT}/openai/deployments/${config.AZURE_OPENAI_DEPLOYMENT_NAME}/chat/completions?api-version=${config.OPENAI_API_VERSION}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": config.AZURE_OPENAI_API_KEY,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
          max_tokens: 500,
          temperature: 0.7,
        }),
      }
    );

    const data = await response.json();
    return data.choices[0]?.message?.content || "No response from API";
  } catch (error) {
    console.error("Error calling Azure OpenAI:", error);
    throw error;
  }
}

// Listen for text selection
document.addEventListener("mouseup", () => {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;

  const selectedText = selection.toString().trim();
  if (selectedText.length === 0) return;

  // If no full selection is made yet, store it
  if (!fullSelection) {
    fullSelection = highlightSelection(selection, "full-highlight");
    console.log("Full selection:\n\t", fullSelection);
  } else {
    // If full selection exists, check if the second selection is inside the first
    const fullText = document.querySelector(".full-highlight");
    if (fullText && fullText.innerText.includes(selectedText)) {
      if (partialSelection) {
        clearPartialSelection(); // Clear previous partial selection
      }
      partialSelection = highlightSelection(selection, "partial-highlight");
      console.log("Partial selection:\n\t", partialSelection);

      callAzureOpenAIUsingFetch(fullSelection, partialSelection).then(
        console.log
      );

      // Store selections for further use
      chrome.storage.local.set({ fullSelection, partialSelection });
    }
  }

  selection.removeAllRanges(); // Clear selection so user sees highlights
});

// Listen for keyboard shortcuts
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    clearSelections(); // Clear all selections when Esc is pressed
  }
});
