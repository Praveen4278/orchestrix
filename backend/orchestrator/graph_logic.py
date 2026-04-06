import numpy as np
import networkx as nx
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.cluster import KMeans
from typing import List, Dict, Any
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "../"))
from shared.models import Paper

def generate_graph_data(papers: List[Paper], similarity_threshold: float = 0.2) -> Dict[str, Any]:
    """
    Transforms a list of papers into a graph with clusters and bridge papers.
    """
    if not papers:
        return {"nodes": [], "links": []}

    # 1. Vectorize Abstracts for Semantic Similarity
    abstracts = [p.abstract if p.abstract else "" for p in papers]
    # Handle empty abstracts by using titles as fallback
    for i, abs_text in enumerate(abstracts):
        if not abs_text or len(abs_text.strip()) < 10:
            abstracts[i] = papers[i].title

    vectorizer = TfidfVectorizer(stop_words='english')
    tfidf_matrix = vectorizer.fit_transform(abstracts)
    
    # Compute Cosine Similarity
    sim_matrix = cosine_similarity(tfidf_matrix)

    # 2. Clustering (K-Means)
    # Determine number of clusters dynamically (min 2, max 5 or papers/3)
    n_clusters = max(2, min(5, len(papers) // 3))
    if len(papers) < n_clusters:
        n_clusters = len(papers)
    
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init='auto')
    cluster_labels = kmeans.fit_predict(tfidf_matrix)

    # 3. Graph Construction with NetworkX
    G = nx.Graph()
    nodes = []
    for i, p in enumerate(papers):
        nodes.append({
            "id": p.id,
            "title": p.title,
            "year": p.year,
            "authors": p.authors,
            "citations": p.citation_count,
            "cluster_id": int(cluster_labels[i]),
            "is_bridge": False,
            "abstract": p.abstract
        })
        G.add_node(p.id, cluster_id=cluster_labels[i])

    links = []
    for i in range(len(papers)):
        for j in range(i + 1, len(papers)):
            weight = float(sim_matrix[i][j])
            if weight >= similarity_threshold:
                links.append({
                    "source": papers[i].id,
                    "target": papers[j].id,
                    "type": "similarity",
                    "weight": weight
                })
                G.add_edge(papers[i].id, papers[j].id)

    # 4. Identify Bridge Papers
    # A bridge paper is connected to nodes in different clusters
    for node_id in G.nodes():
        connected_clusters = set()
        for neighbor in G.neighbors(node_id):
            connected_clusters.add(G.nodes[neighbor]['cluster_id'])
        
        # If connected to more than one distinct cluster (excluding its own)
        own_cluster = G.nodes[node_id]['cluster_id']
        connected_clusters.discard(own_cluster)
        
        if len(connected_clusters) >= 1:
            for node in nodes:
                if node["id"] == node_id:
                    node["is_bridge"] = True
                    break

    return {"nodes": nodes, "links": links}

def summarize_cluster(cluster_id: int, papers: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Extracts key themes and top papers for a specific cluster.
    """
    cluster_papers = [p for p in papers if p["cluster_id"] == cluster_id]
    
    # Sort by citations to find top papers
    top_papers = sorted(cluster_papers, key=lambda x: x.get("citations", 0), reverse=True)[:3]
    
    # Extract themes (simple keyword extraction from titles for now)
    # In a real scenario, this would use an LLM
    all_titles = " ".join([p["title"] for p in cluster_papers])
    # Very basic theme extraction: just take the most frequent words > 4 chars
    from collections import Counter
    words = [w.lower() for w in all_titles.split() if len(w) > 4]
    common_words = [w for w, count in Counter(words).most_common(5)]

    return {
        "cluster_id": cluster_id,
        "count": len(cluster_papers),
        "key_themes": common_words,
        "top_papers": [{"id": p["id"], "title": p["title"]} for p in top_papers],
        "summary": f"This cluster focuses on {', '.join(common_words)}. It contains {len(cluster_papers)} research papers."
    }
