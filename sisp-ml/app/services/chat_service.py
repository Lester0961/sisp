import os
from app.services.classifier_service import classifier_service
from app.services.retrieval_service import retrieval_service
from app.services.groq_service import groq_service

class ChatService:
    def __init__(self):
        pass

    def process_query(self, query: str, conversation_history: list = None) -> dict:
        """Orchestrate the hybrid RAG chat pipeline: Classify -> Retrieve -> Generate."""
        print(f"[CHAT] Processing incoming student query: '{query[:50]}...'")
        
        # 1. Classify Query Intent
        intent_res = classifier_service.classify(query)
        intent = intent_res.get("intent", "general_inquiry")
        confidence = intent_res.get("confidence", 0.0)
        escalate = intent_res.get("escalate", False)
        
        print(f"[CHAT] Intent: {intent} (confidence: {confidence:.2f}, escalate: {escalate})")

        # 2. Retrieve Relevant Context
        # Search first using the matched category, then fallback to general search if no matches
        context_chunks = []
        if not escalate:
            context_chunks = retrieval_service.retrieve(query, limit=3, category=intent)
            
        # Fallback to unrestricted semantic search if category-specific returned nothing or query is general
        if not context_chunks:
            context_chunks = retrieval_service.retrieve(query, limit=3)
            
        print(f"[CHAT] Retrieved {len(context_chunks)} matching knowledge base chunks.")

        # 3. Generate grounded RAG response
        system_message = (
            "You are ARIA (Academic Resource & Information Assistant), a helpful, supportive, "
            "and professional academic advisor at Regis Marie College.\n"
            "Your goal is to answer student questions clearly, concisely, and accurately based ONLY "
            "on the verified institutional policies provided in the context.\n"
            "If the information is not present in the context, politely explain that you don't know "
            "and offer to escalate the inquiry to a human advisor.\n"
            "Format your responses using Markdown headers, lists, and bold text for maximum readability."
        )
        
        response_text = groq_service.generate_completion(
            prompt=query,
            system_message=system_message,
            context_chunks=context_chunks,
            conversation_history=conversation_history
        )

        # 4. Formulate visual sources list for UI citations
        sources = []
        for chunk in context_chunks:
            sources.append({
                "source": chunk.get("source"),
                "category": chunk.get("category"),
                "similarity": chunk.get("similarity"),
                "content_snippet": chunk.get("content")[:100] + "..." if len(chunk.get("content", "")) > 100 else chunk.get("content")
            })

        # Final assembled result
        result = {
            "response": response_text,
            "intent": intent,
            "confidence": confidence,
            "escalate": escalate,
            "sources": sources
        }
        
        print("[CHAT] Query processed successfully!")
        return result

chat_service = ChatService()