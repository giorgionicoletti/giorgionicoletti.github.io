---
layout: archive
title: "Publications"
permalink: /publications/
author_profile: true
---

{% include base_path %}

You can also find my articles on [my Google Scholar profile]({{ site.author.googlescholar }}){:target="_blank"}. Titles link to the published version when there is one; every entry also has direct links to the journal and the preprint.

This is my collaboration network, with the papers coloured by research area and each co-author's node growing with the number of papers we wrote together. Hover on a node to see who or what it is, and click on it for more information. Picking a research area below brings its papers and co-authors forward.

<iframe class="embed embed--network" src="/collab_net/network.html?switch=off" title="Collaboration network"></iframe>

<div class="pub-filters" role="group" aria-label="Filter by research area">
  <button class="pub-filter is-active" type="button" data-theme="all" aria-pressed="true">All <span class="count">{{ site.publications.size }}</span></button>
  {% for t in site.data.themes %}{% assign n = site.publications | where_exp: "p", "p.theme contains t.key" %}
  <button class="pub-filter" type="button" data-theme="{{ t.key }}" aria-pressed="false">{{ t.title }} <span class="count">{{ n.size }}</span></button>{% endfor %}
</div>

<div class="pub-list">
{% assign pubs = site.publications | sort: "date" | reverse %}
{% assign by_year = pubs | group_by_exp: "p", "p.date | date: '%Y'" %}
{% for year in by_year %}
<section class="year-group">
<h2>{{ year.name }}</h2>
{% for post in year.items %}
  {% include archive-single-publication.html %}
{% endfor %}
</section>
{% endfor %}
</div>

<script src="{{ base_path }}/assets/js/filters.js" defer></script>
