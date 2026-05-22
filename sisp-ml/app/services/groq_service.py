import os
from app.config import get_settings
from app.services.cache_service import cache_service
import json

settings = get_settings()

class GroqService:
    def __init__(self):
        self.client = None
        self.is_configured = False
        self.init_client()

    def init_client(self):
        """Initialize the Groq client if a valid API key is present."""
        api_key = settings.groq_api_key
        
        # Check if the key is empty, default placeholder, or not set
        if not api_key or api_key == "replace-this-in-section-3.9" or "replace" in api_key.lower():
            print("[GROQ] No valid GROQ_API_KEY detected. Activating Simulation/Local Mock Mode.")
            self.client = None
            self.is_configured = False
        else:
            try:
                from groq import Groq
                print("[GROQ] Valid API key detected. Initializing Groq client...")
                self.client = Groq(api_key=api_key)
                self.is_configured = True
                print("[GROQ] Groq client successfully initialized!")
            except Exception as e:
                print(f"[GROQ] [ERROR] Failed to initialize Groq client: {e}. Falling back to Simulation Mode.")
                self.client = None
                self.is_configured = False

    def is_ready(self) -> bool:
        return self.is_configured

    def generate_completion(
        self,
        prompt: str,
        system_message: str = None,
        context_chunks: list = None,
        conversation_history: list = None
    ) -> str:
        """Generate response via Groq API or fallback Simulation Mode based on RAG context."""
        
        # Build prompt cache key
        cache_key_data = {
            "prompt": prompt,
            "system_message": system_message,
            "chunks": [c["content"] for c in context_chunks] if context_chunks else [],
            "history": conversation_history
        }
        cache_key_str = json.dumps(cache_key_data, sort_keys=True)
        cache_key = cache_service.make_key(cache_key_str)

        # Check Cache
        cached_response = cache_service.get(cache_key)
        if cached_response:
            print(f"[GROQ] [CACHE_HIT] Retained response for cache key: {cache_key}")
            return cached_response

        # Cache Miss - Generate Completion
        response_text = self._generate_completion_raw(prompt, system_message, context_chunks, conversation_history)
        
        # Store in Cache
        try:
            cache_service.set(cache_key, response_text, ttl_seconds=3600)
            print(f"[GROQ] [CACHE_SET] Cached response for key: {cache_key}")
        except Exception as e:
            print(f"[GROQ] Failed to write cache: {e}")

        return response_text

    def _generate_completion_raw(
        self,
        prompt: str,
        system_message: str = None,
        context_chunks: list = None,
        conversation_history: list = None
    ) -> str:
        """Internal raw generation method."""
        # 1. API Mode
        if self.is_configured and self.client is not None:
            try:
                print("[GROQ] Calling Groq API with llama3-8b-8192...")
                messages = []
                
                # Add system prompt
                sys_prompt = system_message or "You are ARIA, the Academic Advisory Assistant for Regis Marie College."
                if context_chunks:
                    context_text = "\n\n".join([f"Source: {c['source']}\n{c['content']}" for c in context_chunks])
                    sys_prompt += f"\n\nUse the following verified institutional knowledge to answer the student's query:\n{context_text}"
                
                messages.append({"role": "system", "content": sys_prompt})
                
                # Add conversation history
                if conversation_history:
                    for msg in conversation_history:
                        messages.append({"role": msg.get("role"), "content": msg.get("content")})
                
                # Add user query
                messages.append({"role": "user", "content": prompt})
                
                completion = self.client.chat.completions.create(
                    model="llama3-8b-8192",
                    messages=messages,
                    temperature=0.2,
                    max_tokens=1024,
                    top_p=0.9,
                )
                return completion.choices[0].message.content
            except Exception as e:
                print(f"[GROQ] [WARNING] API call failed: {e}. Falling back to Simulation Mode.")
                # Fall through to Simulation Mode
        
        # 2. Simulation / Local Mock Mode Fallback
        print("[GROQ] Generating simulated advising response based on retrieved context...")
        
        # If we have retrieved context chunks, let's craft a beautiful answer!
        if context_chunks:
            # We construct a highly polished answer matching the content of the chunks
            response = "### Hello! I am ARIA, your Academic Advisory Assistant. \n\n"
            response += "Based on the official policies of **Regis Marie College**, here is the information regarding your inquiry:\n\n"
            
            for idx, chunk in enumerate(context_chunks):
                content = chunk["content"]
                # Extract text after header if present
                if "\n" in content:
                    lines = content.split("\n")
                    section_title = lines[0]
                    section_body = "\n".join(lines[1:])
                    
                    # Highlight section title
                    response += f"**From {chunk['source']} ({section_title}):**\n"
                    # Add paragraph indentation or bullets
                    for line in section_body.split("\n"):
                        if line.strip().startswith("-") or line.strip().startswith("*") or (line.strip() and line.strip()[0].isdigit()):
                            response += f"{line}\n"
                        elif line.strip():
                            response += f"> {line}\n"
                    response += "\n"
                else:
                    response += f"**Policy Reference ({chunk['source']}):**\n> {content}\n\n"
            
            response += "*(Note: This information is retrieved directly from our verified student handbook policies. If you have further unique constraints or require direct help, you can request to escalate this chat to a human adviser!)*"
            return response
            
        # If no chunks are retrieved, give a generic polite response
        return (
            "### Hello! I am ARIA, your Academic Advisory Assistant.\n\n"
            "I couldn't find a specific student handbook policy matching your exact inquiry in my database.\n\n"
            "To make sure you get the most accurate assistance, I will gladly **escalate this conversation to a human academic advisor**. "
            "A registrar staff member or academic Dean will review your query and respond directly in your SISP portal shortly.\n\n"
            "In the meantime, feel free to ask me other questions about **enrollment, grading, or document requests**, or specify your details!"
        )

groq_service = GroqService()