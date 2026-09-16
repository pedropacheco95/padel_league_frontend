import { useEffect, useRef, useState } from "react";

type ChatMessage = {
  id: number;
  sender: "user" | "bot" | "loading";
  fullText: string;
  displayText: string;
  isAnimating?: boolean;
};

const TYPING_DELAY_MS = 10;

export default function ChatbotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLDivElement | null>(null);
  const nextMessageId = useRef(1);

  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const animatedMessage = messages.find((message) => message.isAnimating);
    if (!animatedMessage) return;

    const timeoutId = window.setTimeout(() => {
      setMessages((currentMessages) =>
        currentMessages.map((message) => {
          if (message.id !== animatedMessage.id) {
            return message;
          }

          const nextLength = message.displayText.length + 1;
          const isComplete = nextLength >= message.fullText.length;

          return {
            ...message,
            displayText: message.fullText.slice(0, nextLength),
            isAnimating: isComplete ? false : true,
          };
        }),
      );
    }, TYPING_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [messages]);

  const syncInputValue = () => {
    const value = inputRef.current?.innerText ?? "";
    setInputValue(value.replace(/\u00a0/g, " "));
  };

  const clearInput = () => {
    setInputValue("");
    if (inputRef.current) {
      inputRef.current.innerText = "";
    }
  };

  const appendMessage = (message: Omit<ChatMessage, "id">) => {
    const id = nextMessageId.current++;
    setMessages((currentMessages) => [...currentMessages, { id, ...message }]);
    return id;
  };

  const removeMessage = (id: number) => {
    setMessages((currentMessages) =>
      currentMessages.filter((message) => message.id !== id),
    );
  };

  const sendMessage = async () => {
    const userInput = inputValue.trim();
    if (!userInput || isSending) return;

    setIsSending(true);
    appendMessage({
      sender: "user",
      fullText: userInput,
      displayText: userInput,
    });
    clearInput();

    const loadingId = appendMessage({
      sender: "loading",
      fullText: "",
      displayText: "",
    });

    try {
      const response = await fetch("/api/v1/chatbot/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body: new URLSearchParams({ user_input: userInput }),
        credentials: "same-origin",
      });

      // The backend answers 502 with a friendly fallback message when the
      // LLM fails, so read the body before deciding whether this is an error.
      const data = (await response.json().catch(() => null)) as {
        response?: string;
      } | null;

      if (!data?.response) {
        throw new Error(`Server responded with ${response.status}`);
      }

      removeMessage(loadingId);

      appendMessage({
        sender: "bot",
        fullText: data.response,
        displayText: "",
        isAnimating: true,
      });
    } catch (error) {
      removeMessage(loadingId);
      appendMessage({
        sender: "bot",
        fullText:
          error instanceof Error ? `Error: ${error.message}` : "Error sending message",
        displayText:
          error instanceof Error ? `Error: ${error.message}` : "Error sending message",
      });
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="chatbot_out_container">
      {messages.length === 0 ? (
        <h2 className="chatbot_initial_greeting" id="chatbot_initial_greeting">
          Então o que vens perguntar hoje?
        </h2>
      ) : null}

      <div className="chatbot">
        <div
          className={`chatContainer ${messages.length === 0 ? "hiddenDiv" : ""}`}
          id="chatContainer"
          ref={chatContainerRef}
        >
          {messages.map((message) => {
            if (message.sender === "loading") {
              return (
                <div className="message" id="loadingMessage" key={message.id}>
                  <span className="chatbot_loader"></span>
                </div>
              );
            }

            return (
              <div
                className={`message ${
                  message.sender === "user" ? "user-message" : "bot-message"
                }`}
                key={message.id}
              >
                {message.displayText}
              </div>
            );
          })}
        </div>

        <div className="chatFormContainer" id="chatFormContainer">
          <div
            ref={inputRef}
            contentEditable={!isSending}
            suppressContentEditableWarning
            id="user_input"
            data-placeholder="Escreve aqui a tua perguntinha..."
            onInput={syncInputValue}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void sendMessage();
              }
            }}
          />
          <button id="sendButton" type="button" onClick={() => void sendMessage()}>
            {">"}
          </button>
        </div>
      </div>
    </div>
  );
}
