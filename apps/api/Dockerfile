FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY Chatbot.sln ./
COPY src/Chatbot.Domain/*.csproj src/Chatbot.Domain/
COPY src/Chatbot.Application/*.csproj src/Chatbot.Application/
COPY src/Chatbot.Infrastructure/*.csproj src/Chatbot.Infrastructure/
COPY src/Chatbot.Api/*.csproj src/Chatbot.Api/
COPY tests/Chatbot.Tests/*.csproj tests/Chatbot.Tests/
RUN dotnet restore
COPY . .
RUN dotnet publish src/Chatbot.Api -c Release -o /out --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /out .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
USER $APP_UID
ENTRYPOINT ["dotnet", "Chatbot.Api.dll"]
