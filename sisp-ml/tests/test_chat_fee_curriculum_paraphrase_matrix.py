"""Offline paraphrase contracts for common prices and curriculum questions."""

import asyncio

from app.services.chat_service import chat_service


FEE_TARGETS = (
    ("a certified true copy of my grades", "PHP 300 per copy", "PHP 150"),
    ("the second copy of my grades", "PHP 150 per copy", "PHP 300"),
    ("a certificate of good moral", "PHP 500 per copy", None),
    ("a TOR", "PHP 500 per page", None),
    ("a COE", "PHP 300 per copy", None),
)
FEE_FORMS = (
    "How much is {target}?",
    "What is the fee for {target}?",
    "What is the price of {target}?",
    "How much do I pay for {target}?",
    "How much does {target} cost?",
    "Please tell me the fee for {target}.",
    "How much would {target} cost?",
    "What are the listed fees for {target}?",
    "What fee does the College list for {target}?",
    "Can you confirm the cost of {target}?",
)

CURRICULUM_TERMS = (
    "first year and first trimester",
    "1st year and trimester 1",
    "year one and first term",
    "freshman year and trimester 1",
    "unang taon at unang trimester",
)
CURRICULUM_FORMS = (
    "What subjects are listed for BSCS in the {term}?",
    "Which courses appear in BSCS during the {term}?",
    "List the BSCS subjects for the {term}.",
    "Show me the courses in the BSCS curriculum for the {term}.",
    "Which subjects are part of the BSCS program in the {term}?",
    "Can you show the course list for BSCS during the {term}?",
    "What courses are taught in BSCS in the {term}?",
    "Give me the BSCS subject list for the {term}.",
    "Anong mga subject ang nasa BSCS para sa {term}?",
    "Unsa nga mga subjects ang naa sa BSCS sa {term}?",
)


def test_one_hundred_local_price_and_curriculum_paraphrases():
    """Run 50 price and 50 curriculum variants through the local chat flow."""
    question_count = 0

    for target, expected, wrong_amount in FEE_TARGETS:
        for form in FEE_FORMS:
            query = form.format(target=target)
            result = asyncio.run(chat_service.process_query(query))
            question_count += 1

            assert result["route"] == "policy", query
            assert result["intent"] == "document_request", query
            assert expected in result["response"], (query, result["response"])
            if wrong_amount:
                assert wrong_amount not in result["response"], (query, result["response"])
            assert any(
                source["source"] == "document_fees_user_approved.txt"
                for source in result["sources"]
            ), query

    for term in CURRICULUM_TERMS:
        for form in CURRICULUM_FORMS:
            query = form.format(term=term)
            result = asyncio.run(chat_service.process_query(query))
            question_count += 1

            assert result["route"] == "policy", query
            assert "GE 6100" in result["response"], (query, result["response"])
            assert any("curriculum_BSCS_2024.txt" == source["source"] for source in result["sources"]), query

    assert question_count == 100
