"""Static sources explicitly approved for ARIA retrieval in this phase.

Unapproved policy files stay out of the ARIA corpus until durable approval
metadata is provided. The normalized interview is approved as qualified
interview-derived guidance only. The owner-supplied student-services FAQ is
approved as source-specific Q&A with embedded freshness and limitation notes;
it is not a blanket assertion of current policy. Curriculum filenames are the
per-program files listed in the verified program catalog.
"""

APPROVED_STATIC_SOURCES = frozenset({
    "program_catalog.txt",
    "document_fees_user_approved.txt",
    "enrollment_interview_guidance.txt",
    "student_services_faq_2026.txt",
    "curriculum_BEED_2024.txt",
    "curriculum_BSCrim_2026.txt",
    "curriculum_BSCS_2024.txt",
    "curriculum_BSEd-Eng_2024.txt",
    "curriculum_BSEd-Fil-2024_2024.txt",
    "curriculum_BSEd-Fil-2026_2026.txt",
    "curriculum_BSEd-Math_2024.txt",
    "curriculum_BSOA_2024.txt",
    "curriculum_BSMA_2026.txt",
})
