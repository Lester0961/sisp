import re


ACADEMIC_TERMS = {
    "academic", "adviser", "advisor", "balance", "cashier", "class", "course", "curriculum",
    "diploma", "document", "enroll", "enrollment", "exam", "finals", "grade", "graduation",
    "midterm", "permit", "prelim", "prerequisite", "registrar", "request", "schedule", "semester",
    "student", "subject", "transcript", "treasury", "tuition", "akademiko", "bayad", "bayranan",
    "dokumento", "grado", "iskedyul", "klase", "kurso", "mag enroll", "matrikula", "paaralan",
    "pagsusulit", "permiso", "subject ko", "enrolment", "eskwela", "iskwela", "pag enroll", "pasulit",
    "grades", "enrollment_status", "document_request_status",
}

OUT_OF_SCOPE_TERMS = {
    "recipe", "celebrity", "politics", "weather", "movie", "write code", "game cheat", "sports score",
    "stock price", "crypto", "write my essay", "dating",
}

PERSONAL_MARKERS = {"ko", "ako", "mine", "akong", "siak", "current", "akin", "my", "akon"}
PERSONAL_ROUTES = {
    "grades": {"grades", "grado", "grade", "marka"},
    "schedule": {"class schedule", "schedule", "oras ng klase", "iskedyul"},
    "balance": {"account balance", "balance", "bayranan", "matrikula", "tuition"},
    "enrollment_status": {"enrolled", "naka enroll", "nakapag enroll", "enrollment status"},
    "document_request_status": {"document request status", "status ng request", "request status"},
}


class ScopeService:
    @staticmethod
    def route(query: str) -> dict:
        normalized = re.sub(r"\s+", " ", (query or "").casefold()).strip()

        is_personal = any(
            marker.split() in normalized.split() or marker in normalized
            for marker in PERSONAL_MARKERS
        )
        if is_personal:
            for action, terms in PERSONAL_ROUTES.items():
                if any(term in normalized for term in terms):
                    return {"route": "database", "action": action, "inScope": True}

        if any(term in normalized for term in OUT_OF_SCOPE_TERMS):
            return {"route": "out_of_scope", "action": None, "inScope": False}

        if any(term in normalized for term in ACADEMIC_TERMS):
            return {"route": "policy", "action": None, "inScope": True}

        if normalized in {"hello", "hi", "hey", "good morning", "good afternoon", "kumusta", "maayong adlaw"}:
            return {"route": "greeting", "action": None, "inScope": True}

        return {"route": "out_of_scope", "action": None, "inScope": False}


scope_service = ScopeService()
