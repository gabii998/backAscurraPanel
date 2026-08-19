-- An API key identifies exactly one error-reporting configuration.
CREATE UNIQUE INDEX "ErrorConfig_apiKeyId_key" ON "ErrorConfig"("apiKeyId");
