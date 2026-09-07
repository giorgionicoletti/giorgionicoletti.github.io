---
layout: archive
title: "Publications"
permalink: /publications/
author_profile: true
---

{% include base_path %}

You can also find my articles on [my Google Scholar profile]({{ site.author.googlescholar }}){:target="_blank"}. Titles link to the published version when there is one; every entry also has direct links to the journal and the preprint.

This is my collaboration network. Each node is either a <span class="k-coauthor">co-author</span>, a <span class="k-preprint">preprint</span> or a <span class="k-journal">journal article</span>; the size of a co-author's node grows with the number of papers we wrote together. Hover on a node to see who or what it is, and click on it for more information.

<iframe class="embed embed--network" src="/collab_net/network.html" title="Collaboration network"></iframe>

{% assign pubs = site.publications | sort: "date" | reverse %}
{% assign by_year = pubs | group_by_exp: "p", "p.date | date: '%Y'" %}
{% for year in by_year %}
<h2>{{ year.name }}</h2>
{% for post in year.items %}
  {% include archive-single-publication.html %}
{% endfor %}
{% endfor %}
