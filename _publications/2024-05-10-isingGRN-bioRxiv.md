---
title: "Unveiling gene perturbation effects through Gene Regulatory Networks inference from single-cell transcriptomic data"
collection: preprint
permalink: /publication/2024-05-10-isingGRN-bioRxiv
excerpt: 'preprint'
date: 2024-05-10
year: '2024'
authors: 'Clelia Corridori, Merrit Romeike, Giorgio Nicoletti, Christa Buecker, Samir Suweis, Sandro Azaele, Graziano Martello'
venue: 'bioRxiv 2024.05.10.593314 (2024)'
preprinturl: 'https://www.biorxiv.org/content/10.1101/2024.05.10.593314v1'
citation: 'Clelia Corridori, Merrit Romeike, Giorgio Nicoletti, Christa Buecker, Samir Suweis*, Sandro Azaele*, Graziano Martello*. Unveiling gene perturbation effects through Gene Regulatory Networks inference from single-cell transcriptomic data. bioRxiv 2024.05.10.593314 (2024) (* equal contribution).'
---

## Abstract
Physiological and pathological processes are governed by a network of genes called gene regulatory networks (GRNs). By reconstructing GRNs, we can accurately model how cells behave in their natural state and predict how genetic changes will affect them. Transcriptomic data of single cells are now available for a wide range of cellular processes in multiple species. Thus, a method building predictive GRNs from single-cell RNA sequencing (scRNA-seq) data, without any additional prior knowledge, could have a great impact on our understanding of biological processes and the genes playing a key role in them. To this aim, we developed IGNITE (Inference of Gene Networks using Inverse kinetic Theory and Experiments), an unsupervised machine learning framework designed to infer directed, weighted, and signed GRNs directly from unperturbed single-cell RNA sequencing data. IGNITE uses the GRNs to generate gene expression data upon single and multiple genetic perturbations. IGNITE is based on the inverse problem for a kinetic Ising model, a model from statistical physics that has been successfully applied to biological networks. We tested IGNITE on murine pluripotent stem cells (PSCs) transitioning from the naive to formative states. Using as input only scRNA-seq data of unperturbed PSCs, IGNITE simulated single and triple gene knockouts. Comparison with experimental data revealed high accuracy, up to 74%, outperforming currently available methods. In sum, IGNITE identifies predictive GRNs from scRNA-seq data without additional prior knowledge and faithfully simulates single and multiple gene perturbations. Applications of IGNITE range from studying cell differentiation to identifying genes specifically active under pathological conditions.