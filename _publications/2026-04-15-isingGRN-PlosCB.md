---
title: "Unveiling gene perturbation effects through gene regulatory networks inference from single-cell transcriptomic data"
collection: publications
permalink: /publication/2026-04-15-isingGRN-PlosCB
excerpt: 'Journal article'
date: 2026-04-15
year: '2026'
authors: 'Clelia Corridori, Merrit Romeike, Giorgio Nicoletti, Christa Buecker, Samir Suweis, Sandro Azaele, Graziano Martello'
venue: 'PLOS Computational Biology 22 (4), e1014067 (2026)'
paperurl: 'https://doi.org/10.1371/journal.pcbi.1014067'
preprinturl: 'https://www.biorxiv.org/content/10.1101/2024.05.10.593314v1'
citation: 'Clelia Corridori, Merrit Romeike, Giorgio Nicoletti, Christa Buecker, Samir Suweis, Sandro Azaele, Graziano Martello. Unveiling gene perturbation effects through gene regulatory networks inference from single-cell transcriptomic data. PLOS Computational Biology 22 (4), e1014067 (2026)'
---

## Abstract
Physiological and pathological processes are governed by networks of genes called gene regulatory networks (GRNs). By reconstructing GRNs, we can accurately model how cells behave in their natural state and predict how genetic changes will affect them. Transcriptomic data of single cells are now available for a wide range of cellular processes in multiple species. Thus, a method building predictive GRNs from single-cell RNA sequencing (scRNA-seq) data, without any additional prior knowledge, could have a great impact on our understanding of biological processes and the genes playing a key role in them. To this aim, we developed IGNITE (Inference of Gene Networks using Inverse kinetic Theory and Experiments), an unsupervised machine learning framework designed to infer directed, weighted, and signed GRNs directly from unperturbed single-cell RNA sequencing data. IGNITE uses the GRNs to generate gene expression data upon single and multiple genetic perturbations. IGNITE is based on the inverse problem for a kinetic Ising model, a model from statistical physics that has been successfully applied to biological networks. We tested IGNITE on two complementary systems of pluripotent stem cells (PSCs): murine PSCs transitioning from the naïve to formative states, and human PSCs differentiating toward definitive endoderm. These datasets differ in species, developmental trajectory, and single-cell technology (10X vs. Fluidigm C1), providing a stringent test of generalizability. Using only unperturbed scRNA-seq data, IGNITE simulated single and multiple gene knockouts (KOs) and produced predictions consistent with independent experimental observations. In mouse PSCs, IGNITE generated wild-type data highly correlated with experiments and accurately predicted the effects of Rbpj, Etv5, and triple KOs, while in human PSCs it correctly predicted differentiation-promoting and differentiation-blocking perturbations, in agreement with published studies. These results demonstrate that IGNITE robustly captures gene interaction logic across species and technologies, enabling robust in silico perturbation analyses directly from scRNA-seq data.

