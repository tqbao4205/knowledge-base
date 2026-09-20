package com.knowledgebase.api.repository;

import com.knowledgebase.api.domain.entity.ChatConversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChatConversationRepository extends JpaRepository<ChatConversation, UUID> {
    List<ChatConversation> findByProjectIdAndUserIdOrderByUpdatedAtDesc(UUID projectId, UUID userId);
    Optional<ChatConversation> findByIdAndProjectId(UUID id, UUID projectId);
}
