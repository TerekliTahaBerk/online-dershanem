\set ON_ERROR_STOP on

SELECT 'users' AS relation, COUNT(*) AS row_count FROM users
UNION ALL SELECT 'product_memberships', COUNT(*) FROM product_memberships
UNION ALL SELECT 'od_orders', COUNT(*) FROM od_orders
UNION ALL SELECT 'od_payments', COUNT(*) FROM od_payments
UNION ALL SELECT 'odk_orders', COUNT(*) FROM odk_orders
UNION ALL SELECT 'odk_payments', COUNT(*) FROM odk_payments
UNION ALL SELECT 'odk_exams', COUNT(*) FROM odk_exams
UNION ALL SELECT 'odk_exam_versions', COUNT(*) FROM odk_exam_versions
UNION ALL SELECT 'odk_exam_sections', COUNT(*) FROM odk_exam_sections
UNION ALL SELECT 'odk_exam_questions', COUNT(*) FROM odk_exam_questions
UNION ALL SELECT 'odk_exam_attempts', COUNT(*) FROM odk_exam_attempts
UNION ALL SELECT 'odk_attempt_answers', COUNT(*) FROM odk_attempt_answers
UNION ALL SELECT 'odk_attempt_scores', COUNT(*) FROM odk_attempt_scores
ORDER BY relation;

DO $restore_readiness$
DECLARE
  violation_count bigint;
BEGIN
  SELECT COUNT(*) INTO violation_count
  FROM product_memberships membership
  LEFT JOIN users member ON member.id = membership.user_id
  LEFT JOIN users granter ON granter.id = membership.granted_by_id
  WHERE member.id IS NULL
     OR (membership.granted_by_id IS NOT NULL AND granter.id IS NULL);
  IF violation_count <> 0 THEN
    RAISE EXCEPTION 'product membership integrity violations: %', violation_count;
  END IF;

  SELECT COUNT(*) INTO violation_count
  FROM od_orders orders
  LEFT JOIN users buyer ON buyer.id = orders.user_id
  LEFT JOIN "Package" package ON package.id = orders.package_id
  WHERE (orders.user_id IS NOT NULL AND buyer.id IS NULL)
     OR (orders.package_id IS NOT NULL AND package.id IS NULL);
  IF violation_count <> 0 THEN
    RAISE EXCEPTION 'OD order integrity violations: %', violation_count;
  END IF;

  SELECT COUNT(*) INTO violation_count
  FROM od_payments payment
  LEFT JOIN od_orders orders ON orders.id = payment.order_id
  WHERE orders.id IS NULL;
  IF violation_count <> 0 THEN
    RAISE EXCEPTION 'OD payment integrity violations: %', violation_count;
  END IF;

  SELECT COUNT(*) INTO violation_count
  FROM odk_orders orders
  LEFT JOIN odk_packages package ON package.id = orders.package_id
  WHERE package.id IS NULL;
  IF violation_count <> 0 THEN
    RAISE EXCEPTION 'ODK order integrity violations: %', violation_count;
  END IF;

  SELECT COUNT(*) INTO violation_count
  FROM odk_payments payment
  LEFT JOIN odk_orders orders ON orders.id = payment.order_id
  WHERE orders.id IS NULL;
  IF violation_count <> 0 THEN
    RAISE EXCEPTION 'ODK payment integrity violations: %', violation_count;
  END IF;

  SELECT COUNT(*) INTO violation_count
  FROM odk_exam_versions version
  LEFT JOIN odk_exams exam ON exam.id = version.exam_id
  LEFT JOIN odk_scoring_policies policy ON policy.id = version.scoring_policy_id
  LEFT JOIN users creator ON creator.id = version.created_by_id
  WHERE exam.id IS NULL OR policy.id IS NULL OR creator.id IS NULL;
  IF violation_count <> 0 THEN
    RAISE EXCEPTION 'ODK exam version integrity violations: %', violation_count;
  END IF;

  SELECT COUNT(*) INTO violation_count
  FROM odk_exams exam
  LEFT JOIN odk_exam_versions version ON version.id = exam.current_version_id
  WHERE exam.current_version_id IS NOT NULL
    AND (version.id IS NULL OR version.exam_id <> exam.id);
  IF violation_count <> 0 THEN
    RAISE EXCEPTION 'ODK current version integrity violations: %', violation_count;
  END IF;

  SELECT COUNT(*) INTO violation_count
  FROM odk_exam_attempts attempt
  LEFT JOIN odk_exams exam ON exam.id = attempt.exam_id
  LEFT JOIN odk_exam_versions version ON version.id = attempt.version_id
  LEFT JOIN users student ON student.id = attempt.student_user_id
  WHERE exam.id IS NULL
     OR version.id IS NULL
     OR student.id IS NULL
     OR version.exam_id <> attempt.exam_id;
  IF violation_count <> 0 THEN
    RAISE EXCEPTION 'ODK attempt integrity violations: %', violation_count;
  END IF;

  SELECT COUNT(*) INTO violation_count
  FROM odk_attempt_answers answer
  LEFT JOIN odk_exam_attempts attempt ON attempt.id = answer.attempt_id
  LEFT JOIN odk_exam_questions question ON question.id = answer.question_id
  LEFT JOIN odk_exam_sections section ON section.id = question.section_id
  WHERE attempt.id IS NULL
     OR question.id IS NULL
     OR section.id IS NULL
     OR section.version_id <> attempt.version_id;
  IF violation_count <> 0 THEN
    RAISE EXCEPTION 'ODK answer integrity violations: %', violation_count;
  END IF;

  SELECT COUNT(*) INTO violation_count
  FROM odk_attempt_scores score
  LEFT JOIN odk_exam_attempts attempt ON attempt.id = score.attempt_id
  LEFT JOIN users scorer ON scorer.id = score.scored_by_id
  WHERE attempt.id IS NULL OR scorer.id IS NULL;
  IF violation_count <> 0 THEN
    RAISE EXCEPTION 'ODK score integrity violations: %', violation_count;
  END IF;
END
$restore_readiness$;

SELECT COUNT(*) AS restored_public_tables
FROM information_schema.tables
WHERE table_schema = 'public';

SELECT 'restore readiness smoke checks passed' AS result;
