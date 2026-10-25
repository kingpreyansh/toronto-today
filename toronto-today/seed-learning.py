#!/usr/bin/env python3
"""Add the deep-reading section to today's briefing payload and note verification status.

Reading time is stored as a short label rather than a number: the publisher requires
every published field to be a string.

Verification status per link, checked from this server on 2026-09-26:
  - Anthropic x2, Google Spanner, Kubernetes: HTTP 200, real titles read.
  - NeurIPS Attention Is All You Need PDF: HTTP 200.
  - The four Netflix Technology Blog posts: Cloudflare bot protection returns 403 to
    this server AND to a text proxy, so they could not be independently confirmed
    here. They are the reader's own links and are recorded as such.
"""
import json
from pathlib import Path

SRC = Path('/home/ubuntu/phiads-odysseus/daily-briefing/2026-09-26.json')

LEARNING = [
    {
        "title": "How and why Netflix built a real-time distributed graph (part 3: querying with gRPC)",
        "topic": "Distributed systems",
        "level": "Advanced",
        "read": "20 min",
        "why": "How Netflix serves a real-time graph at scale, and why gRPC was chosen over REST for the query path.",
        "source": "Netflix Technology Blog",
        "url": "https://netflixtechblog.com/how-and-why-netflix-built-a-real-time-distributed-graph-part-3-querying-the-graph-with-grpc-0f3468349607",
    },
    {
        "title": "In-house LLM serving at Netflix",
        "topic": "Inference and serving",
        "level": "Advanced",
        "read": "18 min",
        "why": "What it actually takes to serve LLMs in-house: throughput, latency and cost tradeoffs at production scale.",
        "source": "Netflix Technology Blog",
        "url": "https://netflixtechblog.com/in-house-llm-serving-at-netflix-a5a8e799ea2c",
    },
    {
        "title": "GenRec: towards LLM-native recommendation at Netflix",
        "topic": "AI engineering",
        "level": "Advanced",
        "read": "22 min",
        "why": "How recommendation is being rebuilt around LLMs rather than classic ranking models.",
        "source": "Netflix Technology Blog",
        "url": "https://netflixtechblog.com/genrec-towards-llm-native-recommendation-at-netflix-f20be6f643e3",
    },
    {
        "title": "Building service topology at scale: architecture challenges and lessons learned",
        "topic": "Distributed systems",
        "level": "Intermediate",
        "read": "16 min",
        "why": "How to model service topology across a large estate, and the architectural mistakes Netflix hit doing it.",
        "source": "Netflix Technology Blog",
        "url": "https://netflixtechblog.com/building-service-topology-at-scale-architecture-challenges-and-lessons-learned-f4b792f3f0d8",
    },
    {
        "title": "Attention Is All You Need",
        "topic": "Transformer architecture",
        "level": "Advanced",
        "read": "45 min",
        "why": "The original transformer paper: self-attention replaces recurrence, which is what unlocked modern LLMs.",
        "source": "NeurIPS 2017",
        "url": "https://proceedings.neurips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf",
    },
    {
        "title": "Building effective agents",
        "topic": "Agent design",
        "level": "Intermediate",
        "read": "25 min",
        "why": "Practical patterns for agent systems, and how to tell when a simple workflow beats an autonomous agent.",
        "source": "Anthropic Engineering",
        "url": "https://www.anthropic.com/engineering/building-effective-agents",
    },
    {
        "title": "Introducing Contextual Retrieval",
        "topic": "Context engineering",
        "level": "Intermediate",
        "read": "15 min",
        "why": "Why chunks lose their meaning in isolation, and how prepending context cuts retrieval failures in a RAG pipeline.",
        "source": "Anthropic Engineering",
        "url": "https://www.anthropic.com/engineering/contextual-retrieval",
    },
    {
        "title": "Spanner: Google's globally-distributed database",
        "topic": "Distributed systems",
        "level": "Advanced",
        "read": "40 min",
        "why": "TrueTime and external consistency: how a globally distributed database keeps a consistent view of time and order.",
        "source": "Google Research",
        "url": "https://research.google/pubs/spanner-googles-globally-distributed-database-2/",
    },
    {
        "title": "Cluster Architecture",
        "topic": "Kubernetes",
        "level": "Foundational",
        "read": "12 min",
        "why": "The control plane and node components, and how a deployment actually gets scheduled onto a node.",
        "source": "Kubernetes documentation",
        "url": "https://kubernetes.io/docs/concepts/architecture/",
    },
]

payload = json.loads(SRC.read_text())
payload['learning'] = LEARNING
SRC.write_text(json.dumps(payload, indent=1, ensure_ascii=False))
print(json.dumps({
    'file': str(SRC),
    'learning_items': len(payload['learning']),
    'total_keys': len(payload.keys()),
}, indent=1))