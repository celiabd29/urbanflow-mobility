"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import include, path

from .health import health_view

urlpatterns = [
    path('admin/', admin.site.urls),
    # Routes d'authentification de l'app users, préfixées par /api/auth/.
    path('api/auth/', include('users.urls')),
    # Proxy itinéraires (Sprint 2).
    path('api/routing/', include('routing.urls')),
    # APIs de transport : vélos en libre-service et perturbations (Sprint 3).
    path('api/transport/', include('transport.urls')),
    # Empreinte carbone des trajets (Sprint 4).
    path('api/carbon/', include('carbon.urls')),
    # Diagnostic : quelle base tourne réellement en production.
    path('api/health/', health_view, name='health'),
]
